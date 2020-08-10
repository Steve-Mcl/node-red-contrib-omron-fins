/*
MIT License

Copyright (c) 2019, 2020 Steve-Mcl

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

module.exports = function (RED) {
  var connection_pool = require("../connection_pool.js");

  function omronRead(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.name = config.name;
    node.topic = config.topic;
    node.connection = config.connection;
    node.address = config.address || "topic";
    node.addressType = config.addressType || "msg";
    node.count = config.count || 1;
    node.countType = config.countType || "num";
    node.outputFormat = config.outputFormat || "buffer";
    node.outputFormatType = config.outputFormatType || "list";
    node.msgProperty = config.msgProperty || "payload";
    node.msgPropertyType = config.msgPropertyType || "str";
    node.connectionConfig = RED.nodes.getNode(node.connection);

    if (this.connectionConfig) {
      var options = Object.assign({}, node.connectionConfig.options);
      node.client = connection_pool.get(this.connectionConfig.port, this.connectionConfig.host, options);
      node.status({ fill: "yellow", shape: "ring", text: "initialising" });

      this.client.on('error', function (error, seq) {
        node.status({ fill: "red", shape: "ring", text: "error" });
        node.error(error, (seq && seq.tag ? tag : seq) );
      });
      this.client.on('full', function () {
        node.throttleUntil = Date.now() + 1000;
        node.warn("Client buffer is saturated. Requests for the next 1000ms will be ignored. Consider reducing poll rate of reads and writes to this connection.");
        node.status({ fill: "red", shape: "dot", text: "queue full" });
      });
      this.client.on('open', function (error) {
        node.status({ fill: "green", shape: "dot", text: "connected" });
      });
      this.client.on('close', function (error) {
        node.status({ fill: "red", shape: "dot", text: "not connected" });
      });
      this.client.on('initialised', function (error) {
        node.status({ fill: "yellow", shape: "dot", text: "initialised" });
      });

      function finsReply(err, sequence) {
        if(!err && !sequence) {
          return;
        }
        var origInputMsg = (sequence && sequence.tag) || {};
        try {
          if (err || sequence.error) {
            node.status({ fill: "red", shape: "ring", text: "error" });
            node.error(err || sequence.error, origInputMsg);
            return;
          }          
          if (sequence.timeout) {
            node.status({ fill: "red", shape: "ring", text: "timeout" });
            node.error("timeout", origInputMsg);
            return;
          }
          var cmdExpected = "0101";
          if (sequence.response && sequence.sid != sequence.response.sid) {
            node.status({ fill: "red", shape: "dot", text: "Incorrect SID" });
            node.error(`SID does not match! My SID: ${sequence.sid}, reply SID:${sequence.response.sid}`, origInputMsg);
            return;
          }          
          if (!sequence || !sequence.response || sequence.response.endCode !== "0000" || sequence.response.command !== cmdExpected) {
            var ecd = "bad response";
            if (sequence.response && sequence.response.command !== cmdExpected)
              ecd = `Unexpected response. Expected command '${cmdExpected}' but received " ${sequence.response.command}`;
            else if (sequence.response && sequence.response.endCodeDescription)
              ecd = sequence.response.endCodeDescription;
            node.status({ fill: "red", shape: "dot", text: ecd });
            node.error(`Response is NG! endCode: ${sequence.response ? sequence.response.endCode : "????"}, endCodeDescription:${sequence.response ? sequence.response.endCodeDescription : ""}`, origInputMsg);
            return;
          }

          var kvMaker = function (pkt) {
            let kvs = {};
            if (pkt.response.values) {
              let iWD = 0;
              for (let x in pkt.response.values) {
                let item_addr = node.client.decodedAddressToString(pkt.request.address, iWD, 0);
                kvs[item_addr] = pkt.response.values[x];
                iWD++;
              }
            }
            return kvs;
          };

          var outputFormat = RED.util.evaluateNodeProperty(node.outputFormat, node.outputFormatType, node, origInputMsg);
          var value;
          switch (outputFormat) {
            case "signed":
              value = sequence.response.values;
              break;
            case "unsigned":
              sequence.response.values = Uint16Array.from(sequence.response.values);
              value = sequence.response.values;
              break;
            case "signedkv":
              value = kvMaker(sequence);
              break;
            case "unsignedkv":
              sequence.response.values = Uint16Array.from(sequence.response.values);
              value = kvMaker(sequence);
              break;
            default: //buffer
              value = sequence.response.buffer;
              break;
          }

          //set the output property
          RED.util.setObjectProperty(origInputMsg, node.msgProperty, value, true);

          //include additional detail in msg.fins
          origInputMsg.fins = {};
          origInputMsg.fins.name = node.name; //node name for user logging / routing
          origInputMsg.fins.request = {
            address: sequence.request.address,
            count: sequence.request.count,
            sid: sequence.request.sid,
          };

          origInputMsg.fins.response = sequence.response;
          origInputMsg.fins.stats = sequence.stats;
          origInputMsg.fins.createTime = sequence.createTime;
          origInputMsg.fins.replyTime = sequence.replyTime;
          origInputMsg.fins.timeTaken = sequence.timeTaken;

          node.status({ fill: "green", shape: "dot", text: "done" });
          node.send(origInputMsg);
        } catch (error) {
          node.status({ fill: "red", shape: "ring", text: "error" });
          node.error(error, origInputMsg);
        }
      }

      this.on('close', function (done) {
        if (done) done();
      });

      this.on('input', function (msg) {
        if (node.throttleUntil) {
          if (node.throttleUntil > Date.now()) return; //throttled
          node.throttleUntil = null; //throttle time over
        }
        node.status({});//clear status

        if (msg.disconnect === true || msg.topic === 'disconnect') {
          node.connection.closeConnection();
          return;
        } else if (msg.connect === true || msg.topic === 'connect') {
          node.connection.connect();
          return;
        }

        /* ****************  Node status **************** */
        var nodeStatusError = function (err, msg, statusText) {
          if (err) {
            console.error(err);
            node.error(err, msg);
          } else {
            console.error(statusText);
            node.error(statusText, msg);
          }
          node.status({ fill: "red", shape: "dot", text: statusText });
        };

        /* ****************  Get address Parameter **************** */
        var address = RED.util.evaluateNodeProperty(node.address, node.addressType, node, msg);

        /* ****************  Get count Parameter **************** */
        var count = RED.util.evaluateNodeProperty(node.count, node.countType, node, msg);

        if (address == "") {
          nodeStatusError(null, msg, "address is empty");
          return;
        }
        count = parseInt(count);
        if (Number.isNaN(count)) {
          nodeStatusError(null, msg, "count is not valid");
          return;
        }

        try {
          let sid = this.client.read(address, parseInt(count), finsReply, msg);
          if (sid > 0) {
            node.status({ fill: "yellow", shape: "ring", text: "reading" });
          }
        } catch (error) {
          node.sid = null;
          nodeStatusError(error, msg, "error");
          let dbgmsg = {
            info: "read.js-->on 'input'",
            connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`,
            address: address,
            size: count,
          };
          console.debug(dbgmsg);
          return;
        }

      });
      node.status({ fill: "green", shape: "ring", text: "ready" });

    } else {
      node.status({ fill: "red", shape: "dot", text: "configuration not setup" });
    }
  }
  RED.nodes.registerType("FINS Read", omronRead);
  omronRead.prototype.close = function () {
    if (this.client) {
      this.client.disconnect();
    }
  };
};


/* eslint-disable no-inner-declarations */
/*
MIT License

Copyright (c) 2019, 2020, 2021 Steve-Mcl

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
  const connection_pool = require("../connection_pool.js");
  function omronWrite(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.name = config.name;
    node.connection = config.connection;
    node.address = config.address || "topic";
    node.addressType = config.addressType || "msg";
    node.data = config.data || "payload";
    node.dataType = config.dataType || "msg";
    node.msgProperty = config.msgProperty || "payload";
    node.msgPropertyType = config.msgPropertyType || "str";
    node.connectionConfig = RED.nodes.getNode(node.connection);

    /* ****************  Node status **************** */
    function nodeStatusError (err, msg, statusText) {
      if (err) {
        console.error(err);
        node.error(err, msg);
      } else {
        console.error(statusText);
        node.error(statusText, msg);
      }
      node.status({ fill: "red", shape: "dot", text: statusText });
    };

    function nodeStatusParameterError (err, msg, propName) {
      nodeStatusError(err, msg, "Unable to evaluate property '" + propName + "' value");
    };

    if (this.connectionConfig) {

      node.status({ fill: "yellow", shape: "ring", text: "initialising" });
      const options = Object.assign({}, node.connectionConfig.options);
      this.client = connection_pool.get(this, this.connectionConfig.port, this.connectionConfig.host, options);

      this.client.on('error', function (error) {
        console.log("Error: ", error);
        node.status({ fill: "red", shape: "ring", text: "error" });
        node.error(error, (seq && seq.tag ? tag : seq) );
      });
      this.client.on('full', function () {
        node.status({ fill: "red", shape: "dot", text: "queue full" });
        node.throttleUntil = Date.now() + 1000;
        node.warn("Client buffer is saturated. Requests for the next 1000ms will be ignored. Consider reducing poll rate of reads and writes to this connection.");
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
            nodeStatusError(err || sequence.error, origInputMsg, "error");

            return;
          }  
          if (sequence.timeout) {
            nodeStatusError("timeout", origInputMsg, "timeout");
            return;
          }
          if (sequence.response && sequence.sid != sequence.response.sid) {
            nodeStatusError(`SID does not match! My SID: ${sequence.sid}, reply SID:${sequence.response.sid}`, origInputMsg,"Incorrect SID");

            return;
          }
          var cmdExpected = "0102";
          if (!sequence || !sequence.response || sequence.response.endCode !== "0000" || sequence.response.command !== cmdExpected) {
            var ecd = "bad response";
            if (sequence.response && sequence.response.command !== cmdExpected)
              ecd = `Unexpected response. Expected command '${cmdExpected}' but received '${sequence.response.command}'`;
            else if (sequence.response && sequence.response.endCodeDescription)
              ecd = sequence.response.endCodeDescription;
            nodeStatusError(`Response is NG! endCode: ${sequence.response ? sequence.response.endCode : "????"}, endCodeDescription:${sequence.response ? sequence.response.endCodeDescription : ""}`, origInputMsg, ecd);
            return;
          }

          //set the output property
          RED.util.setObjectProperty(origInputMsg, node.msgProperty, sequence.sid || 0, true);

          //include additional detail in msg.fins
          origInputMsg.fins = {};
          origInputMsg.fins.name = node.name; //node name for user logging / routing
          origInputMsg.fins.request = {
            address: sequence.request.address,
            dataToBeWritten: sequence.request.dataToBeWritten,
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
          nodeStatusError(error, origInputMsg, "error");

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
          node.client.closeConnection();
          return;
        } else if (msg.connect === true || msg.topic === 'connect') {
          node.client.connect();
          return;
        }

        /* ****************  Get address Parameter **************** */
        const address = RED.util.evaluateNodeProperty(node.address, node.addressType, node, msg);

        /* ****************  Get data Parameter **************** */
        let data;
        RED.util.evaluateNodeProperty(node.data, node.dataType, node, msg, function (err, value) {
          if (err) {
            nodeStatusParameterError(err, msg, "data");
            return;//halt flow!
          } else {
            data = value;
          }
        });

        if (!address || typeof address != "string") {
          nodeStatusError(null, msg, "address is not valid");
          return;
        }
        if (data == null) {
          nodeStatusError(null, msg, "data is not valid");
          return;
        }

        try {
          const opts = msg.finsOptions || {};
          opts.callback = finsReply;
          const sid = this.client.write(address, data, finsReply, msg);
          if (sid > 0) node.status({ fill: "yellow", shape: "ring", text: "write" });
        } catch (error) {

          nodeStatusError(error, msg, "error");
          const dbgmsg = {
            info: "write.js-->on 'input' - try this.client.write(address, data, finsReply)",
            connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`,
            address: address,
            data: data,
            error: error
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
  RED.nodes.registerType("FINS Write", omronWrite);
  omronWrite.prototype.close = function () {
    if (this.client) {
      this.client.disconnect();
    }
  };
};


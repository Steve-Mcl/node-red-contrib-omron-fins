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
		node.sign = config.sign;
    node.connectionConfig = RED.nodes.getNode(node.connection);
    var context = node.context();
		node.busy = false;
		node.busyMonitor;
		node.busyTimeMax = 1000;//TODO: Parameterise hard coded value!
    var fins = require('../omron-fins.js');
    if (this.connectionConfig) {
			var options = Object.assign({}, node.connectionConfig.options);
      node.client = connection_pool.get(this.connectionConfig.port, this.connectionConfig.host, options);
      node.status({fill:"yellow",shape:"ring",text:"initialising"});

      this.client.on('error', function (error) {
        console.log("Error: ", error);
				node.status({fill:"red",shape:"ring",text:"error"});
				node.busy = false;
      });
      this.client.on('open', function (error) {
        node.status({fill:"green",shape:"dot",text:"connected"});
      });
      this.client.on('close', function (error) {
				node.status({fill:"red",shape:"dot",text:"not connected"});
				node.busy = false;
      });
      this.client.on('initialised', function (error) {
        node.status({fill:"yellow",shape:"dot",text:"initialised"});
      });

			function myReply(msg) {
				node.busy = false;//reset busy - allow node to be triggered
				clearTimeout(node.busyMonitor);

        if(msg.timeout)  {
          node.status({fill:"red",shape:"ring",text:"timeout"});
					node.error("timeout",msg);
					var dbgmsg = {
            f: 'myReply(msg)',
            msg: msg,
            error: 'timeout'
          }
          console.error(dbgmsg);
          return;
				}
				
        if(node.sid && msg.response && node.sid != msg.response.sid){
          node.status({fill:"red",shape:"dot",text:"Incorrect SID"});
					node.error(`SID does not match! My SID: ${node.sid}, reply SID:${msg.response.sid}`,msg);
					var dbgmsg = {
            f: 'myReply(msg)',
            msg: msg,
            error: `SID does not match! My SID = ${node.sid}, reply SID = ${msg.response.sid}`
          }
          console.error(dbgmsg);
          return;
        }
        var cmdExpected = "0101";
        if(!msg || !msg.response || msg.response.endCode !== "0000" || msg.response.command !== cmdExpected )  {
					var ecd = "bad response";
					if(msg.response && msg.response.command !== cmdExpected)
						ecd = `Unexpected response. Expected command '${cmdExpected}' but received " ${msg.response.command}`
					else if(msg.response && msg.response.endCodeDescription)
						ecd = msg.response.endCodeDescription; 
          node.status({fill:"red", shape:"dot", text:ecd});
					node.error(`Response is NG! endCode: ${msg.response.endCode}, endCodeDescription:${msg.response.endCodeDescription}`,msg);
					var dbgmsg = {
            f: 'myReply(msg)',
            msg: msg,
            error: ecd
          }
          console.error(dbgmsg);
          return;
        }


				var outDetail = {};
				var iWD = 0;
				if(msg.response.values) {
					if(node.sign == "unsigned"){
						msg.response.values = Uint16Array.from(msg.response.values)
					} 
					for (var x in msg.response.values) {
						//var buff_address = config.address.charAt(0) + ":" + String(parseInt(config.address.slice(1)) + x);
						var buff_address = node.client.decodedAddressToString(msg.request.address,iWD,0)
						var buff_value = String(msg.response.values[x]);
						outDetail[buff_address] = buff_value;
						iWD++;
					}
				}
				var newMsg = {payload: msg.response.values, request: msg.request, response: msg.response, name: node.name, topic : node.topic, data: outDetail};
				node.status({fill:"green",shape:"dot",text:"done"});
        node.send(newMsg);
      }

			this.on('input', function (msg) {
				node.status({});//clear status

				if(msg.disconnect === true || msg.topic === 'disconnect'){
					node.connection.closeConnection();
					return;
				} else if(msg.connect === true || msg.topic === 'connect'){
					node.connection.connect();
					return;
				}

				if(node.busy)
					return;//TODO: Consider queueing inputs?
				
				/* ****************  Node status **************** */
				var nodeStatusError = function(err,msg,statusText){
					if(err){
						console.error(err);
						node.error(err,msg);
					} else {
						console.error(statusText);
						node.error(statusText,msg);
					}
					node.status({fill:"red",shape:"dot",text:statusText});
				}
				var nodeStatusParameterError = function(err, msg, propName){
						nodeStatusError(err, msg, "Unable to evaluate property '" + propName + "' value")
				}

				/* ****************  Get address Parameter **************** */
				var address;
				RED.util.evaluateNodeProperty(node.address,node.addressType,node,msg,(err,value) => {
						if (err) {
								nodeStatusParameterError(err,msg,"address");
								return;//halt flow!
						} else {
								address = value; 
						}
				});

				/* ****************  Get count Parameter **************** */
				var count;
				RED.util.evaluateNodeProperty(node.count,node.countType,node,msg,(err,value) => {
						if (err) {
								nodeStatusParameterError(err,msg,"count");
								return;//halt flow!
						} else {
								count = value; 
						}
				});

				if(address == "")	{
					nodeStatusError(null,msg,"address is empty");
					return;
				}
				count = parseInt(count);
				if(Number.isNaN(count))	{
					nodeStatusError(null,msg,"count is not valid");
					return;
				}
				//if node
				if(!config.sign && msg.payload.sign){
					node.sign = "unsigned";
				}

				try {
					node.status({fill:"yellow",shape:"ring",text:"read"});
					node.busy = true;
					if (node.busyTimeMax) {
						node.busyMonitor = setTimeout(function() {
							if(node.busy){
								nodeStatusError(null,msg,"timeout")
								node.busy = false;
								return;
							}
						}, node.busyTimeMax);
					}
					node.sid = this.client.read(address, parseInt(count), myReply);
				} catch (error) {
					node.sid = null;
          node.busy = false;
					nodeStatusError(error,msg,"Error")
					var dbgmsg = { 
						info: "read.js-->on 'input'",
            connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`, 
            address: address,
            size: count,
					 };
					console.debug(dbgmsg);
          return;
				}
				
			});
			node.status({fill:"green",shape:"ring",text:"ready"});

		} else {
			nodeStatusError(null,msg,"configuration not setup")
    }
	}
	RED.nodes.registerType("FINS Read", omronRead);
	omronRead.prototype.close = function() {
		if (this.client) {
			this.client.disconnect();
		}
	}
};


module.exports = function (RED) {
  var connection_pool = require("../connection_pool.js");
  var util = require("util");

  function omronWrite(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.name = config.name;
    node.connection = config.connection;
		node.address = config.address || "topic";
		node.addressType = config.addressType || "msg";
		node.data = config.data || "payload";
		node.dataType = config.dataType || "msg";
    node.connectionConfig = RED.nodes.getNode(node.connection);
    var context = node.context();
    node.sid = "";
    node.busy = false;
		node.busyTimeMax = 1000;//TODO: Parameterise hard coded value!
    var fins = require('../omron-fins.js');
    if (this.connectionConfig) {

      node.status({fill:"yellow",shape:"ring",text:"initialising"});
			var options = Object.assign({}, node.connectionConfig.options);
      this.client = connection_pool.get(this.connectionConfig.port, this.connectionConfig.host, options);

      this.client.on('error', function (error) {
        console.log("Error: ", error);
        node.status({fill:"red",shape:"ring",text:"error"});
      });
      this.client.on('open', function (error) {
        node.status({fill:"green",shape:"dot",text:"connected"});
      });
      this.client.on('close', function (error) {
        node.status({fill:"red",shape:"dot",text:"not connected"});
      });

      function myReply(msg) {
        node.busy = false;//reset busy - allow node to be triggered
        clearTimeout(node.busyMonitor);

        if(msg.timeout)  {
          node.status({fill:"red",shape:"ring",text:"timeout"});
          node.error("timeout");
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
					node.error(`SID does not match! My SID: ${node.sid}, reply SID:${msg.response.sid}`);
					var dbgmsg = {
            f: 'myReply(msg)',
            msg: msg,
            error: `SID does not match! My SID = ${node.sid}, reply SID = ${msg.response.sid}`
          }
          console.error(dbgmsg);
          return;
        }
        var cmdExpected = "0102";
        if(!msg || !msg.response || msg.response.endCode !== "0000" || msg.response.command !== cmdExpected )  {
          var ecd = "bad response";
					if(msg.response && msg.response.command !== cmdExpected)
						ecd = `Unexpected response. Expected command '${cmdExpected}' but received " ${msg.response.command}`
					else if(msg.response && msg.response.endCodeDescription)
						ecd = msg.response.endCodeDescription; 
          node.status({fill:"red", shape:"dot", text:ecd});
					node.error(`Response is NG! endCode: ${msg.response.endCode}, endCodeDescription:${msg.response.endCodeDescription}`);
          var dbgmsg = {
            f: 'myReply(msg)',
            msg: msg,
            error: ecd
          }
          console.error(dbgmsg);
          return;
        }


        //TODO: consider payload - what to send! True? SID? IDK!
        var newMsg = {payload: node.sid, request: msg.request, response: msg.response, name: node.name, topic : node.topic};

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

				/* ****************  Get data Parameter **************** */
				var data;
				RED.util.evaluateNodeProperty(node.data,node.dataType,node,msg,(err,value) => {
						if (err) {
								nodeStatusParameterError(err,msg,"data");
								return;//halt flow!
						} else {
								data = value; 
						}
        });
        
        if(address == "")	{
					nodeStatusError(null,msg,"address is empty");
					return;
				}
				if(!data)	{
					nodeStatusError(null,msg,"data is not valid");
					return;
				}
        
        try {
          node.status({fill:"yellow",shape:"ring",text:"write"});
          node.busy = true;
          if (node.busyTimeMax) {
            this.busyMonitor = setTimeout(function() {
              if(node.busy){
                node.status({fill:"red",shape:"ring",text:"timeout"});
                node.error("timeout");
                node.busy = false;
                return;
              }
            }, node.busyTimeMax);
          }          
          node.sid = this.client.write(address, data, myReply);
        } catch (error) {
          node.sid = null;
          node.busy = false;
          nodeStatusError(error,msg,"Error")
          var dbgmsg = { 
						info: "write.js-->on 'input' - try this.client.write(address, data, myReply)",
            connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`, 
            address: address,
            data: data,
						error: error
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
  RED.nodes.registerType("FINS Write", omronWrite);
  omronWrite.prototype.close = function() {
		if (this.client) {
			this.client.disconnect();
		}
	}
};


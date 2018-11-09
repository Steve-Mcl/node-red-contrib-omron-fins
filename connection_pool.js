var util = require("util");
var settings = require(process.env.NODE_RED_HOME + "/red/red").settings;

var clients = {};


function convertPayloadToDataArray(payload) {
  var array = [];
  var str = '';
  
  if (Array.isArray(payload)) {
    return payload;
  } else if (typeof payload === "string") {
    str = "" + payload;
  } else if (typeof payload === "object") {
    str = "" + payload.data;
  } else {
    array = payload;
  }

  if (str.length === 0) {
    return null;
  } else {
    array = str.split(/\s*,\s*/).map(Number);
  }
  return array;
}


module.exports = {
  
  get: function (port,host,opts) {
    var fins = require('./omron-fins.js');
    var id = "FinsClient:{host:'" + (host || "") + "', port:" + (port || "''") + ", MODE:" + opts.MODE + ", ICF:" + opts.ICF + ", DNA:" + opts.DNA + ", DA1:" + opts.DA1  + ", DA2:" + opts.DA2 +  ", SNA:" + opts.SNA + ", SA1:" + opts.SA1  + ", SA2:" + opts.SA2  + "}";
    //var context = this.context();
    var node = this;
    
    if (!clients[id]) {
      clients[id] = function () {
        var options = opts || {};
        var h = host || options.host;
        var p = port || options.port;
        
        util.log(`[FINS] adding new connection to pool ~ ${id}`);
        var client = fins.FinsClient(parseInt(p),h,options);
        var connecting = false;
        var obj = {

          _instances: 0,
          write: function (addr,data, callback) {
              var data = convertPayloadToDataArray(data);
              if(!Array.isArray(data)){
                throw new Error('data is not valid');
              }
              var sid = client.write(addr, data, callback);
              return sid;
          },
          read: function (addr,len, callback) {
              var sid = client.read(addr, parseInt(len), callback);
              return sid;
          },
          on: function (a, b) {
            client.on(a, b);
          },
          connect: function () {
            //connection is made upon requesting READ/WRITE etc. Perhaps consider re-initialising???
            // if (client && !client.connected && !connecting) {
            //   connecting = true;
            //   //client.reconnect(); <-- cant call this from here
            // }
          },
          
          decodeMemoryAddress : function (addressString)  {
            return client.decodeMemoryAddress(addressString);
          },

          decodedAddressToString : function (decodedAddress, offsetWD, offsetBit)  {
            return client.decodedAddressToString(decodedAddress, offsetWD, offsetBit);
          },

          disconnect: function () {
            this._instances -= 1;
            if (this._instances <= 0) {
              util.log(`[FINS] closing connection ~ ${id}`);
              client.close();
              client = null;
              util.log(`[FINS] deleting connection from pool ~ ${id}`);
              delete clients[id];
            }
          }
        };
        
        client.on('open', function () {
          if (client) {
            util.log(`[FINS] connected ~ ${id}`);
            connecting = false;
            
          }
        });
        client.on('close', function (err) {
          util.log(`[FINS] connection closed ~ ${id}`);
          connecting = false;
          setTimeout(function () {
            obj.connect();
          }, settings.FINSReconnectTime || 5000);
        });

        return obj
      }();
    }
    clients[id]._instances += 1;
    return clients[id];
  }
};
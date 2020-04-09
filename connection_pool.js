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

var util = require("util");
var clients = {};


function convertPayloadToDataArray(payload) {
  var array = [];
  var str = '';

  if (Array.isArray(payload)) {
    return payload;
  } else if (typeof payload === "string") {
    str = "" + payload;
  } else if (typeof payload === "number") {
    str = "" + payload;
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

  get: function (port, host, opts) {
    var fins = require('./omron-fins.js');
    var id = "FinsClient:{host:'" + (host || "") + "', port:" + (port || "''") + ", MODE:" + opts.MODE + ", ICF:" + opts.ICF + ", DNA:" + opts.DNA + ", DA1:" + opts.DA1 + ", DA2:" + opts.DA2 + ", SNA:" + opts.SNA + ", SA1:" + opts.SA1 + ", SA2:" + opts.SA2 + "}";
    //var context = this.context();
    var node = this;

    if (!clients[id]) {
      clients[id] = function () {
        var options = opts || {};
        var h = host || options.host;
        var p = port || options.port;

        util.log(`[FINS] adding new connection to pool ~ ${id}`);
        var client = fins.FinsClient(parseInt(p), h, options);
        var connecting = false;

        options.autoConnect = options.autoConnect == undefined ? true : options.autoConnect;
        options.preventAutoReconnect = false;

        var obj = {

          _instances: 0,
          write: function (addr, data, callback) {
            if (!client.connected && options.preventAutoReconnect) {
              throw new Error("Not connected!")
            }
            var data = convertPayloadToDataArray(data);
            if (!Array.isArray(data)) {
              throw new Error('data is not valid');
            }
            var sid = client.write(addr, data, callback);
            return sid;
          },
          read: function (addr, len, callback) {
            if (!client.connected && options.preventAutoReconnect) {
              throw new Error("Not connected!")
            }
            var sid = client.read(addr, parseInt(len), callback);
            return sid;
          },
          getAutoConnect: function () {
            return (options.autoConnect == true);
          },
          setAutoConnect: function (b) {
            options.autoConnect = (b == true);
          },
          on: function (a, b) {
            client.on(a, b);
          },
          connect: function () {
            options.preventAutoReconnect = false;
            if (client && !client.connected && !connecting) {
              connecting = true;
              client.reconnect(); 
            }
          },
          closeConnection: function () {
            options.preventAutoReconnect = true;
            if (client){
              client.close();
            }
            connecting = false;
          },
          decodeMemoryAddress: function (addressString) {
            return client.decodeMemoryAddress(addressString);
          },

          decodedAddressToString: function (decodedAddress, offsetWD, offsetBit) {
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

          if(options.autoConnect && !options.preventAutoReconnect){
            setTimeout(function () {
              if(options.autoConnect && !options.preventAutoReconnect){
                util.log(`[FINS] autoConnect call from  error handler ~ ${id}`);
                obj.connect();
              }
            },  5000); //TODO: Parameterise
          }
        });

        return obj
      }();
    }
    clients[id]._instances += 1;
    return clients[id];
  }
};
var dgram = require('dgram');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var constants = require('./constants');

module.exports = FinsClient;

function FinsClient(port, host, options) {
    if (!(this instanceof FinsClient)) return new FinsClient(port, host, options);
    EventEmitter.call(this);
    FinsClient.init.call(this, port, host, options);
};

inherits(FinsClient, EventEmitter);



_compareArrays = function (a, b) {
    if (a.length !== b.length)
        return false;
    for (var i = a.length; i--;) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
};


/* Credit to http://tech.karbassi.com/2009/12/17/pure-javascript-flatten-array/ */
_mergeArrays = function (array) {
    var flat = [];
    for (var i = 0, l = array.length; i < l; i++) {
        var type = Object.prototype.toString.call(array[i]).split(' ').pop().split(']').shift().toLowerCase();
        if (type) { flat = flat.concat(/^(array|collection|arguments|object)$/.test(type) ? _mergeArrays(array[i]) : array[i]); }
    }
    return flat;
};


_keyFromValue = function (dict, value) {
    var key = Object.keys(dict)
        .filter(function (key) {
            return dict[key] === value
        }
        )[0];

    return key;
};



_padHex = function (width, number) {
    return ("0" * width + number.toString(16).substr(-width));
};



_wordsToBytes = function (words) {
    var bytes = [];
    if (!words.length) {
        bytes.push((words & 0xff00) >> 8);
        bytes.push((words & 0x00ff));
    } else {
        for (var i in words) {
            bytes.push((words[i] & 0xff00) >> 8);
            bytes.push((words[i] & 0x00ff));
        }
    }
    return bytes;

};

_decodedAddressToString = function (decodedMemoryAddress, offsetWD, offsetBit){
    offsetWD = isInt(offsetWD,0);
    if(decodedMemoryAddress.Bit){
        offsetBit = isInt(offsetBit,0);
        return  `${decodedMemoryAddress.MemoryArea}${parseInt(decodedMemoryAddress.Address)+offsetWD}.${decodedMemoryAddress.Bit+offsetBit}`
    }
    return  `${decodedMemoryAddress.MemoryArea}${parseInt(decodedMemoryAddress.Address)+offsetWD}`
}

_decodeMemoryAddress = function (addressString) {
    var re = /(.)([0-9]*)\.?([0-9]*)/; //normal address Dxxx Cxxx
    if(addressString.includes("_"))
        re = /(.+)_([0-9]*)\.?([0-9]*)/; //handle Ex_   basically E1_ is same as E + 1 up to 15 then E16_=0x60 ~ 0x68
    var matches = addressString.match(re);
    var decodedMemory = {
        'MemoryArea': matches[1],
        'Address': matches[2],
        'Bit':matches[3]
    };
    return decodedMemory;
}

_translateMemoryAddressString = function (addressString, memoryAreas) {
    var decodedMemoryAddress = _decodeMemoryAddress(addressString);
    return _translateMemoryAddress(decodedMemoryAddress,memoryAreas);
}

_translateMemoryAddress = function (decodedMemoryAddress, memoryAreas) {

    var temp = [];
    var byteEncodedMemory = [];

    var memAreaCode = memoryAreas[decodedMemoryAddress.MemoryArea]; //get INT value for desired Memory Area (e.g. D=0x82)
    if (!memAreaCode) {
        return null;//null? something else? throw error?
    }
    var memAreaAddress = memoryAreas.CalculateMemoryAreaAddress(decodedMemoryAddress.MemoryArea, decodedMemoryAddress.Address);//Calculate memAreaAddress value (e.g. C12 = 12 + 0x8000 )

    temp.push([memAreaCode]);
    temp.push(_wordsToBytes([memAreaAddress]));
    temp.push([0x00]);//TODO: handle bit addresses 
    byteEncodedMemory = _mergeArrays(temp);

    return byteEncodedMemory;


};

_incrementSID = function (sid) {
    return (sid % 254) + 1;
};

_buildHeader = function (header) {
    var builtHeader = [
        header.ICF,
        header.RSV,
        header.GCT,
        header.DNA,
        header.DA1,
        header.DA2,
        header.SNA,
        header.SA1,
        header.SA2,
        header.SID
    ];
    return builtHeader;

};

_buildPacket = function (raw) {
    var packet = [];
    packet = _mergeArrays(raw);
    return packet;
};

_getResponseType = function (buf) {

    var response = [];
    response.push(buf[10]);
    response.push(buf[11]);
    return response;
};

_processDefault = function (buf, rinfo) {
    var sid = buf[9];
    var command = (buf.slice(10, 12)).toString("hex");
    var endCode = (buf.slice(12, 14)).toString("hex");
    var endCodeDescription = constants.EndCodeDescriptions[endCode];

    return { remoteHost: rinfo.address, sid: sid, command: command,  endCode: endCode,  endCodeDescription: endCodeDescription };

};

_processStatusRead = function (buf, rinfo) {
    var sid = buf[9];

    var command = (buf.slice(10, 12)).toString("hex");
    var endCode = (buf.slice(12, 14)).toString("hex");
    var endCodeDescription = constants.EndCodeDescriptions[endCode];
    var status = buf[14];
    var mode = buf[15];
    var fatalErrorData = {};
    var nonFatalErrorData = {};
    for (var i in constants.FatalErrorData) {
        if ((buf.readInt16BE(17) & constants.FatalErrorData[i]) != 0)
            fatalErrorData.push(i);
    }

    for (var i in constants.nonFatalErrorData) {
        if ((buf.readInt16BE(18) & constants.nonFatalErrorData[i]) != 0)
            nonFatalErrorData.push(i);
    };
    var statusCodes = constants.Status;
    var runModes = constants.Modes;


    return {
        remoteHost: rinfo.address,
        sid: sid,
        command: command,
        commandDescription: "status",
        endCode: endCode,
        endCodeDescription: endCodeDescription,
        status: _keyFromValue(statusCodes, status),
        mode: _keyFromValue(runModes, mode),
        fatalErrorData: fatalErrorData || null,
        nonFatalErrorData: nonFatalErrorData || null
    };
};

_processMemoryAreaRead = function (buf, rinfo) {
    var data = [];
    var sid = buf[9];
    var command = (buf.slice(10, 12)).toString("hex");
    var endCode = (buf.slice(12, 14)).toString("hex");
    var endCodeDescription = constants.EndCodeDescriptions[endCode];
    var values = (buf.slice(14, buf.length));
    for (var i = 0; i < values.length; i += 2) {
        data.push(values.readInt16BE(i));
    }
    return { remoteHost: rinfo.address, sid: sid, command: command, commandDescription: "read", endCode: endCode,  endCodeDescription: endCodeDescription, values: data };
};


_processReply = function (buf, rinfo) {
    var commands = constants.Commands;
    var responseType = (_getResponseType(buf)).join(' ');

    switch (responseType) {

        case commands.CONTROLLER_STATUS_READ.join(' '):
            return _processStatusRead(buf, rinfo);
            break;

        case commands.MEMORY_AREA_READ.join(' '):
            return _processMemoryAreaRead(buf, rinfo);
            break;

        default:
            return _processDefault(buf, rinfo);

    };

};
_decodePacket = function (buf, rinfo) {
    var data = [];
    var command = (buf.slice(10, 12)).toString("hex");
    var endCode = (buf.slice(12, 14)).toString("hex");
    var endCodeDescription = constants.EndCodeDescriptions[endCode];
    
    var values = (buf.slice(14, buf.length));
    for (var i = 0; i < values.length; i += 2) {
        data.push(values.readInt16BE(i));
    }
    return { remoteHost: rinfo.address, command: command, endCode: endCode, endCodeDescription: endCodeDescription, values: data };
};

FinsClient.reconnect = function () {
    var self = this;
    self.init(self.port, self.host, self.options);
}

function isInt(x,def){
    var v;
    try{
      v = parseInt(x);
      if(isNaN(v))
        return def;
    } catch(e){
      return def;
    }
    return v;
  }

FinsClient.init = function (port, host, options) {
    var self = this;
    var defaultHost = constants.DefaultHostValues;
    var defaultOptions = constants.DefaultOptions;
    this.port = port || defaultHost.port;
    this.host = host || defaultHost.host;
    this.options = options || {};
    this.timeout = (this.options.timeout) || defaultOptions.timeout || 5000;
    this.memoryAreas = constants.CSCJ_MODE_WD_MemoryAreas;
    if(options.MODE == "CV"){
        this.memoryAreas = constants.CV_MODE_WD_MemoryAreas
    }
    //cleanup (if reconnecting, socket might be initialised)
    if (this.socket) {
        this.socket.removeAllListeners();
        delete this.socket;
    }
    this.socket = dgram.createSocket('udp4');
    
    this.header = Object.assign({}, constants.DefaultFinsHeader);
    this.header.ICF = isInt(this.options.ICF, constants.DefaultFinsHeader.ICF);
    this.header.DNA = isInt(this.options.DNA, constants.DefaultFinsHeader.DNA);
    this.header.DA1 = isInt(this.options.DA1, constants.DefaultFinsHeader.DA1);
    this.header.DA2 = isInt(this.options.DA2, constants.DefaultFinsHeader.DA2);
    this.header.SNA = isInt(this.options.SNA, constants.DefaultFinsHeader.SNA);
    this.header.SA1 = isInt(this.options.SA1, constants.DefaultFinsHeader.SA1);
    this.header.SA2 = isInt(this.options.SA2, constants.DefaultFinsHeader.SA2);

    this.connected = false;
    self.requests = {};

    function receive(buf, rinfo) {
        
        var response = _processReply(buf, rinfo);
        if (response) {
            var msg = {response: response};
            var request = self.requests[response.sid];
            msg.timeout = false;
            msg.request = request;
            if(request){
                msg.responseTime = Date.now() - request.sendTime;
                request.responded = true;
                if (request.callback) {
                    request.callback(msg);
                }
            }
            self.emit('reply', msg);
            //delete self.requests[msg.sid];
        } else {
            err = new Error("Unable to process the PLC reply");
            self.emit('error', err);
        }
    }

    function listening() {
        self.emit('open');
        self.connected = true;
    }

    function close() {
        self.emit('close');
        self.connected = false;
    }

    function error(err) {
        self.emit('error', err);
    }

    this.socket.on('message', receive);
    this.socket.on('listening', listening);
    this.socket.on('close', close);
    this.socket.on('error', error);

    //Check each requests timeout!
    if (this.timeout) {
        setTimeout(function cb_setTimeout() {

            var keys = Object.keys(self.requests);
            var len = keys.length;
            var i = 0, prop, req;
            var now = Date.now();
            while (i < len) {
                prop = keys[i];
                req = self.requests[prop];

                if(req && req.sendTime && !req.responded){
                    var diffMS = now - req.sendTime;
                    if(diffMS > self.timeout){
                        self.emit('timeout', self.host);
                        var msg = {request: req};
                        msg.timeout = true;
                        msg.responseTime = diffMS;
                        if (req.callback) {
                            req.callback(msg);
                        }
                    }
                }
                i += 1;
            }
        }, self.timeout);
    }
};


FinsClient.prototype.read = function (address, regsToRead, callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var memoryAddress = _decodeMemoryAddress(address);
    var addressData = _translateMemoryAddress(memoryAddress, this.memoryAreas);
    if(!addressData){
        self.emit('error', new Error("address is invalid"));
        return "";
    }
    var regsToRead = _wordsToBytes(regsToRead);
    var command = constants.Commands.MEMORY_AREA_READ;
    var commandData = [addressData, regsToRead];
    var packet = _buildPacket([header, command, commandData]);
    var buffer = new Buffer(packet);
    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
        }
    });
    self.requests[SID] =
    {
        functionName: "read",
        address: memoryAddress,
        count: regsToRead,
        sid: SID,
        callback: callback,
        sendConfirmed: false,
        responded: false,
        timeout: false,
        sendTime: Date.now()
    };
    return SID;
};

FinsClient.prototype.write = function (address, dataToBeWritten, callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var memoryAddress = _decodeMemoryAddress(address);
    var addressData = _translateMemoryAddress(memoryAddress, this.memoryAreas);
    if(!addressData){
        self.emit('error', new Error("address is invalid"));
        return "";
    }
    var regsToWrite = _wordsToBytes((dataToBeWritten.length || 1));
    var command = constants.Commands.MEMORY_AREA_WRITE;
    var dataToBeWritten = _wordsToBytes(dataToBeWritten);
    var commandData = [addressData, regsToWrite, dataToBeWritten];
    var packet = _buildPacket([header, command, commandData]);
    var buffer = new Buffer(packet);
    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
        }
    });
    self.requests[SID] =
    {
        functionName: "write",
        address: memoryAddress,
        dataToBeWritten: dataToBeWritten,
        sid: SID,
        callback: callback,
        sendConfirmed: false,
        responded: false,
        timeout: false,
        sendTime: Date.now()
    };
    return SID;
};

FinsClient.prototype.fill = function (address, dataToBeWritten, regsToWrite, callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var memoryAddress = _decodeMemoryAddress(address);
    var addressData = _translateMemoryAddress(memoryAddress, this.memoryAreas);
    if(!addressData){
        self.emit('error', new Error("address is invalid"));
        return "";
    }
    var regsToWrite = _wordsToBytes(regsToWrite);
    var command = constants.Commands.MEMORY_AREA_FILL;
    var dataToBeWritten = _wordsToBytes(dataToBeWritten);
    var commandData = [address, regsToWrite, dataToBeWritten];
    var packet = _buildPacket([header, command, commandData]);
    var buffer = new Buffer(packet);
    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
        }
    });
    self.requests[SID] =
                {
                    functionName: "fill",
                    address: memoryAddress,
                    count: regsToWrite,
                    sid: SID,
                    callback: callback,
                    sendConfirmed: false,
                    responded: false,
                    timeout: false,
                    sendTime: Date.now()
                };
    return self.header.SID;
};

FinsClient.prototype.run = function (callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var command = constants.Commands.RUN;
    var packet = _buildPacket([header, command]);
    var buffer = new Buffer(packet);
    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
        }
    });
    self.requests[SID] =
    {
        functionName: "run",
        sid: SID,
        callback: callback,
        sendConfirmed: false,
        responded: false,
        timeout: false,
        sendTime: Date.now()
    };
    return self.header.SID;
};

FinsClient.prototype.stop = function (callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var command = constants.Commands.STOP;
    var packet = _buildPacket([header, command]);
    var buffer = new Buffer(packet);
    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
        }
    });
    self.requests[SID] =
    {
        functionName: "stop",
        sid: SID,
        callback: callback,
        sendConfirmed: false,
        responded: false,
        timeout: false,
        sendTime: Date.now()
    };
    return self.header.SID;
};


FinsClient.prototype.status = function (callback) {
    var self = this;
    var SID = _incrementSID(self.header.SID);
    self.header.SID = SID;
    var header = _buildHeader(self.header);
    var command = constants.Commands.CONTROLLER_STATUS_READ;
    var packet = _buildPacket([header, command]);
    var buffer = new Buffer(packet);

    this.socket.send(buffer, 0, buffer.length, self.port, self.host, function (err) {
        if (err) {
            self.emit('error');//??
        } else {
            if(self.requests[SID]) {
                self.requests[SID].sendConfirmed = true;
            }
            
        }
    });
    self.requests[SID] =    {
        functionName: "status",
        sid: SID,
        callback: callback,
        responded: false,
        timeout: false,
        sendTime: Date.now()
    };
    return SID;

};


FinsClient.prototype.close = function () {
    this.socket.close();
    this.socket.removeAllListeners();
    this.connected = false;
};


FinsClient.prototype.decodeMemoryAddress = function (addressString)  {
    return _decodeMemoryAddress(addressString);
};

FinsClient.prototype.decodedAddressToString = function (decodedAddress, offsetWD, offsetBit)  {
    return _decodedAddressToString(decodedAddress, offsetWD, offsetBit);
};



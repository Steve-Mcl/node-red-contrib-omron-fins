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
    const connection_pool = require('../connection_pool.js');
    const dataParser = require('./_parser');

    function omronRead(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const cmdExpected = '0101';
        node.name = config.name;
        node.topic = config.topic;
        node.connection = config.connection;
        node.address = config.address || 'topic';
        node.addressType = config.addressType || 'msg';
        node.count = config.count || 1;
        node.countType = config.countType || 'num';
        node.outputFormat = config.outputFormat || 'buffer';
        node.outputFormatType = config.outputFormatType || 'list';
        node.msgProperty = config.msgProperty || 'payload';
        node.msgPropertyType = config.msgPropertyType || 'str';
        node.connectionConfig = RED.nodes.getNode(node.connection);

        if (this.connectionConfig) {
            node.client = connection_pool.get(this, node.connectionConfig);
            node.status({ fill: 'yellow', shape: 'ring', text: 'initialising' });

            this.client.on('error', function (error, seq) {
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
                node.error(error, (seq && seq.tag ? seq.tag : seq));
            });
            this.client.on('full', function () {
                node.throttleUntil = Date.now() + 1000;
                node.warn('Client buffer is saturated. Requests for the next 1000ms will be ignored. Consider reducing poll rate of operations to this connection.');
                node.status({ fill: 'red', shape: 'dot', text: 'queue full' });
            });
            // eslint-disable-next-line no-unused-vars
            this.client.on('open', function (remoteInfo) {
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });
            });
            this.client.on('close', function () {
                node.status({ fill: 'red', shape: 'dot', text: 'not connected' });
            });
            // eslint-disable-next-line no-unused-vars
            this.client.on('initialised', function (options) {
                node.status({ fill: 'yellow', shape: 'dot', text: 'initialised' });
            });

            /* ****************  Node status **************** */
            function nodeStatusError(err, msg, statusText) {
                if (err) {
                    node.error(err, msg);
                } else {
                    node.error(statusText, msg);
                }
                node.status({ fill: 'red', shape: 'dot', text: statusText });
            }

            function finsReply(err, sequence) {
                if (!err && !sequence) {
                    return;
                }
                const origInputMsg = (sequence && sequence.tag) || {};
                try {
                    if (err || sequence.error) {
                        nodeStatusError(err || sequence.error, origInputMsg, 'error')
                        return;
                    }
                    if (sequence.timeout) {
                        nodeStatusError('timeout', origInputMsg, 'timeout');
                        return;
                    }
                    if (sequence.response && sequence.sid != sequence.response.sid) {
                        nodeStatusError(`SID does not match! My SID: ${sequence.sid}, reply SID:${sequence.response.sid}`, origInputMsg, 'Incorrect SID')
                        return;
                    }
                    if (!sequence || !sequence.response || sequence.response.endCode !== '0000' || sequence.response.command.commandCode !== cmdExpected) {
                        let ecd = 'bad response';
                        if (sequence.response && sequence.response.command.commandCode !== cmdExpected)
                            ecd = `Unexpected response. Expected command '${cmdExpected}' but received '${sequence.response.command}'`;
                        else if (sequence.response && sequence.response.endCodeDescription)
                            ecd = sequence.response.endCodeDescription;
                        nodeStatusError(`Response is NG! endCode: ${sequence.response ? sequence.response.endCode : '????'}, endCodeDescription:${sequence.response ? sequence.response.endCodeDescription : ''}`, origInputMsg, ecd);
                        return;
                    }

                    //backwards compatibility, try to upgrade users current setting
                    //the output type was originally a sub option 'list'
                    let outputFormat = 'buffer';
                    const builtInReturnTypes = ['buffer', 'signed', 'unsigned', 'signedkv', 'unsignedkv'];
                    if (node.outputFormatType == 'list' && builtInReturnTypes.indexOf(node.outputFormat + '') >= 0) {
                        outputFormat = node.outputFormat;
                    } else if (builtInReturnTypes.indexOf(node.outputFormatType + '') >= 0) {
                        outputFormat = node.outputFormatType;
                    } else {
                        outputFormat = RED.util.evaluateNodeProperty(node.outputFormat, node.outputFormatType, node, origInputMsg);
                    }

                    let value;
                    switch (outputFormat) {
                    case 'signed':
                        if (sequence.request.address.isBitAddress) {
                            value = sequence.response.values.map(e => !!e);
                        } else {
                            value = sequence.response.values;
                        }
                        break;
                    case 'unsigned':
                        if (sequence.request.address.isBitAddress) {
                            value = sequence.response.values;
                        } else {
                            sequence.response.values = Uint16Array.from(sequence.response.values);
                            value = sequence.response.values;
                        }
                        break;
                    case 'signedkv':
                        value = dataParser.keyValueMaker(node.client.FinsAddressToString, sequence.request.address, sequence.response.values);
                        if (sequence.request.address.isBitAddress) {
                            value = dataParser.keyValueMakerBits(node.client.FinsAddressToString, sequence.request.address, sequence.response.values, true);
                        } else {
                            value = dataParser.keyValueMaker(node.client.FinsAddressToString, sequence.request.address, sequence.response.values);
                        }
                        break;
                    case 'unsignedkv':
                        if (sequence.request.address.isBitAddress) {
                            value = dataParser.keyValueMakerBits(node.client.FinsAddressToString, sequence.request.address, sequence.response.values, false);
                        } else {
                            sequence.response.values = Uint16Array.from(sequence.response.values);
                            value = dataParser.keyValueMaker(node.client.FinsAddressToString, sequence.request.address, sequence.response.values);
                        }
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
                        command: sequence.request.command,
                        options: sequence.request.options,
                        address: sequence.request.address,
                        count: sequence.request.count,
                        sid: sequence.request.sid,
                    };

                    origInputMsg.fins.response = sequence.response;
                    origInputMsg.fins.stats = sequence.stats;
                    origInputMsg.fins.createTime = sequence.createTime;
                    origInputMsg.fins.replyTime = sequence.replyTime;
                    origInputMsg.fins.timeTaken = sequence.timeTaken;

                    node.status({ fill: 'green', shape: 'dot', text: 'done' });
                    node.send(origInputMsg);
                } catch (error) {
                    nodeStatusError(error, origInputMsg, 'error');
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
                    node.client.disconnect();
                    return;
                } else if (msg.connect === true || msg.topic === 'connect') {
                    node.client.connect();
                    return;
                }


                /* ****************  Get address Parameter **************** */
                const address = RED.util.evaluateNodeProperty(node.address, node.addressType, node, msg);

                /* ****************  Get count Parameter **************** */
                let count = RED.util.evaluateNodeProperty(node.count, node.countType, node, msg);

                if (!address || typeof address != 'string') {
                    nodeStatusError(null, msg, 'address is not valid');
                    return;
                }
                count = parseInt(count);
                if (Number.isNaN(count) || count <= 0) {
                    nodeStatusError(null, msg, 'count is not valid');
                    return;
                }

                const opts = msg.finsOptions || {};
                let sid;
                try {
                    opts.callback = finsReply;
                    sid = node.client.read(address, count, opts, msg);
                    if (sid > 0) {
                        node.status({ fill: 'yellow', shape: 'ring', text: 'reading' });
                    }
                } catch (error) {
                    node.sid = null;
                    nodeStatusError(error, msg, 'error');
                    const debugMsg = {
                        info: "read.js-->on 'input'",
                        connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`,
                        sid: sid,
                        address: address,
                        count: count,
                        opts: opts,
                    };
                    node.debug(debugMsg);
                    return;
                }

            });
            if(node.client && node.client.connected) {
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });
            } else {
                node.status({ fill: 'grey', shape: 'ring', text: 'initialised' });
            }

        } else {
            node.status({ fill: 'red', shape: 'dot', text: 'configuration not setup' });
        }
    }
    RED.nodes.registerType('FINS Read', omronRead);

};


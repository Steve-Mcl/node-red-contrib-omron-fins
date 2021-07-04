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
    function omronFill(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const cmdExpected = '0103';
        node.name = config.name;
        node.connection = config.connection;
        node.address = config.address || '';
        node.addressType = config.addressType || 'str';
        node.count = config.count || '1';
        node.countType = config.countType || 'num';
        node.value = config.value || '0';
        node.valueType = config.valueType || 'num';
        node.msgProperty = config.msgProperty || 'payload';
        node.msgPropertyType = config.msgPropertyType || 'str';
        node.connectionConfig = RED.nodes.getNode(node.connection);

        /* ****************  Listeners **************** */
        function onClientError(error, seq) {
            node.status({ fill: 'red', shape: 'ring', text: 'error' });
            node.error(error, (seq && seq.tag ? seq.tag : seq));
        }
        function onClientFull() {
            node.throttleUntil = Date.now() + 1000;
            node.warn('Client buffer is saturated. Requests for the next 1000ms will be ignored. Consider reducing poll rate of operations to this connection.');
            node.status({ fill: 'red', shape: 'dot', text: 'queue full' });
        }
        // eslint-disable-next-line no-unused-vars
        function onClientOpen(remoteInfo) {
            node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        }
        function onClientClose() {
            node.status({ fill: 'yellow', shape: 'dot', text: 'not connected' });
        }
        // eslint-disable-next-line no-unused-vars
        function onClientInit(options) {
            node.status({ fill: 'grey', shape: 'dot', text: 'initialised' });
        }

        function removeAllListeners() {
            if(node.client) {
                node.client.off('error', onClientError);
                node.client.off('full', onClientFull);
                node.client.off('open', onClientOpen);
                node.client.off('close', onClientClose);
                node.client.off('initialised', onClientInit);
            }
        }

        /* ****************  Node status **************** */
        function nodeStatusError(err, msg, statusText) {
            if (err) {
                node.error(err, msg);
            } else {
                node.error(statusText, msg);
            }
            node.status({ fill: 'red', shape: 'dot', text: statusText });
        }

        if (this.connectionConfig) {
            node.status({ fill: 'yellow', shape: 'ring', text: 'initialising' });
            if(node.client) {
                node.client.removeAllListeners();
            }
            node.client = connection_pool.get(node, node.connectionConfig);
            this.client.on('error', onClientError);
            this.client.on('full', onClientFull);
            this.client.on('open', onClientOpen);
            this.client.on('close', onClientClose);
            this.client.on('initialised', onClientInit);

            function finsReply(err, sequence) {
                if (!err && !sequence) {
                    return;
                }
                const origInputMsg = (sequence && sequence.tag) || {};
                try {
                    if(sequence) {
                        if (err || sequence.error) {
                            nodeStatusError(((err && err.message) || "error"), origInputMsg, ((err && err.message) || "error") );
                            return;
                        }
                        if (sequence.timeout) {
                            nodeStatusError('timeout', origInputMsg, 'timeout');
                            return;
                        }
                        if (sequence.response && sequence.sid != sequence.response.sid) {
                            nodeStatusError(`SID does not match! My SID: ${sequence.sid}, reply SID:${sequence.response.sid}`, origInputMsg, 'Incorrect SID');
                            return;
                        }
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

                    //set the output property
                    RED.util.setObjectProperty(origInputMsg, node.msgProperty, sequence.sid || 0, true);

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
                removeAllListeners();
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
                if (!address || typeof address != 'string') {
                    nodeStatusError(null, msg, 'address is not valid');
                    return;
                }

                /* ****************  Get fill count Parameter **************** */
                const count = RED.util.evaluateNodeProperty(node.count, node.countType, node, msg);
                const fillCount = parseInt(count);
                if (count == null || isNaN(fillCount) || fillCount <= 0) {
                    nodeStatusError(`fill count '${count} is invalid'`, msg, `fill count '${count} is invalid'`);
                    return;
                }

                /* ****************  Get fill value Parameter **************** */
                const value = RED.util.evaluateNodeProperty(node.value, node.valueType, node, msg);
                const fillValue = parseInt(value);
                if (value == null || isNaN(fillValue)) {
                    nodeStatusError(`fill value '${value} is invalid'`, msg, `fill value '${value} is invalid'`);
                    return;
                }

                const opts = msg.finsOptions || {};
                let sid;
                try {
                    opts.callback = finsReply;
                    //fill(address, value, count, opts, tag)
                    sid = node.client.fill(address, fillValue, fillCount, opts, msg);
                    if (sid > 0) node.status({ fill: 'yellow', shape: 'ring', text: 'fill' });
                } catch (error) {
                    if(error.message == "not connected") {
                        node.status({ fill: 'yellow', shape: 'dot', text: error.message });
                    } else {
                        nodeStatusError(error, msg, 'error');
                        const debugMsg = {
                            info: "fill.js-->on 'input' - try this.client.fill(address, fillValue, fillCount, opts, msg)",
                            connection: `host: ${node.connectionConfig.host}, port: ${node.connectionConfig.port}`,
                            sid: sid,
                            address: address,
                            fillValue: fillValue,
                            fillCount: fillCount,
                            opts: opts,
                            error: error
                        };
                        node.debug(debugMsg);
                    }
                    return;
                }

            });
            if(node.client && node.client.connected) {
                node.status({ fill: 'green', shape: 'dot', text: 'connected' });
            } else {
                node.status({ fill: 'grey', shape: 'ring', text: 'initialised' });
            }

        } else {
            node.status({ fill: 'red', shape: 'dot', text: 'Connection config missing' });
        }

    }
    RED.nodes.registerType('FINS Fill', omronFill);

};


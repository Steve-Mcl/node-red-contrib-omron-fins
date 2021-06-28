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

const clients = {};

function convertPayloadToDataArray(payload) {
    let array = [];
    let str = '';

    if (Array.isArray(payload)) {
        return payload;
    } if (typeof payload === 'string') {
        str = `${payload}`;
    } else if (typeof payload === 'number') {
        return [payload];
    } else if (typeof payload === 'boolean') {
        return [payload];
    }

    if (str.length === 0) {
        return null;
    }
    array = str.split(/\s*,\s*/);

    return array;
}

module.exports = {

    get(node, port, host, opts) {
        const fins = require('./omron-fins');
        const id = `FinsClient:{host:'${host || ''}', port:'${port || ''}', protocol:'${opts.protocol || 'udp'}', MODE:'${opts.MODE}', ICF:'${opts.ICF}', DNA:'${opts.DNA}', DA1:'${opts.DA1}', DA2:'${opts.DA2}', SNA:'${opts.SNA}', SA1:'${opts.SA1}', SA2:'${opts.SA2}'}`;

        if (!clients[id]) {
            clients[id] = (function () {
                const options = opts || {};
                const h = host || options.host;
                const p = port || options.port;

                node.log(`[FINS] adding new connection to pool ~ ${id}`);
                let client = fins.FinsClient(parseInt(p), h, options);
                let connecting = false;

                options.autoConnect = options.autoConnect == undefined ? true : options.autoConnect;
                options.preventAutoReconnect = false;

                const finsClientConnection = {

                    _instances: 0,
                    write(address, data, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const _data = convertPayloadToDataArray(data);
                        if (!Array.isArray(_data)) {
                            throw new Error('data is not valid');
                        }
                        const sid = client.write(address, _data, opts, tag);
                        return sid;
                    },
                    read(address, len, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.read(address, parseInt(len), opts, tag);
                        return sid;
                    },
                    readMultiple(addresses, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.readMultiple(addresses, opts, tag);
                        return sid;
                    },
                    fill(address, value, count, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.fill(address, value, parseInt(count), opts, tag);
                        return sid;
                    },
                    transfer(srcAddress, dstAddress, count, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.transfer(srcAddress, dstAddress, parseInt(count), opts, tag);
                        return sid;
                    },
                    status(opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.status(opts, tag);
                        return sid;
                    },
                    run(opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.run(opts, tag);
                        return sid;
                    },
                    stop(opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.stop(opts, tag);
                        return sid;
                    },
                    cpuUnitDataRead(opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.cpuUnitDataRead(opts, tag);
                        return sid;
                    },
                    getAutoConnect() {
                        return (options.autoConnect == true);
                    },
                    setAutoConnect(b) {
                        options.autoConnect = (b == true);
                    },
                    on(a, b) {
                        client.on(a, b);
                    },
                    connect() {
                        options.preventAutoReconnect = false;
                        if (client && !client.connected && !connecting) {
                            connecting = true;
                            client.reconnect();
                        }
                    },
                    closeConnection() {
                        options.preventAutoReconnect = true;
                        if (client) {
                            client.close();
                        }
                        connecting = false;
                    },
                    stringToFinsAddress(addressString) {
                        return client.stringToFinsAddress(addressString);
                    },

                    FinsAddressToString(decodedAddress, offsetWD, offsetBit) {
                        return client.FinsAddressToString(decodedAddress, offsetWD, offsetBit);
                    },

                    disconnect() {
                        this._instances -= 1;
                        if (this._instances <= 0) {
                            node.log(`[FINS] closing connection ~ ${id}`);
                            client.close();
                            client = null;
                            node.log(`[FINS] deleting connection from pool ~ ${id}`);
                            delete clients[id];
                        }
                    },
                };

                client.on('open', () => {
                    if (client) {
                        node.log(`[FINS] connected ~ ${id}`);
                        connecting = false;
                    }
                });
                // eslint-disable-next-line no-unused-vars
                client.on('close', (err) => {
                    node.log(`[FINS] connection closed ~ ${id}`);
                    connecting = false;

                    if (options.autoConnect && !options.preventAutoReconnect) {
                        setTimeout(() => {
                            if (options.autoConnect && !options.preventAutoReconnect) {
                                node.log(`[FINS] autoConnect call from  error handler ~ ${id}`);
                                finsClientConnection.connect();
                            }
                        }, 5000); // TODO: Parametrise
                    }
                });

                return finsClientConnection;
            }());
        }
        clients[id]._instances += 1;
        return clients[id];
    },
};

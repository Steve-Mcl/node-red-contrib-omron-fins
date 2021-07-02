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

function describe(host, port, options) {
    options = options || {};
    return `{host:'${host || ''}', port:'${port || ''}', protocol:'${options.protocol || 'udp'}', MODE:'${options.MODE}', ICF:'${options.ICF}', DNA:'${options.DNA}', DA1:'${options.DA1}', DA2:'${options.DA2}', SNA:'${options.SNA}', SA1:'${options.SA1}', SA2:'${options.SA2}'}`;
}

const clients = {};
const fins = require('./omron-fins');

module.exports = {

    get(node, connectionConfig) {
        const id = connectionConfig.id;
        let options = connectionConfig.options || {};
        let port = parseInt(connectionConfig.port || options.port);
        let host = connectionConfig.host || options.host;
        let connect = connectionConfig.autoConnect == null ? true : connectionConfig.autoConnect;

        if (!clients[id]) {
            clients[id] = (function () {

                node.log(`Create new FinsClient. id:${id}, config: ${describe(host, port, options)}`);
                let connecting = false;
                let client = fins.FinsClient(port, host, options, connect);

                options.autoConnect = options.autoConnect == null ? true : options.autoConnect;
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
                    clockRead(opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.clockRead(opts, tag);
                        return sid;
                    },
                    clockWrite(clock, opts, tag) {
                        if (!client.connected && options.preventAutoReconnect) {
                            throw new Error('Not connected!');
                        }
                        const sid = client.clockWrite(clock, opts, tag);
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
                    connect(host, port, opts) {
                        options.preventAutoReconnect = false;
                        if (client && !client.connected && !connecting) {
                            try {
                                node.log(`Connecting id:${id}, config: ${describe(this.connectionInfo.host, this.connectionInfo.port, this.connectionInfo.options)}`);
                            // eslint-disable-next-line no-empty
                            } catch (error) { }
                            connecting = true;
                            try {
                                if(arguments.length == 0) {
                                    client.reconnect();
                                } else {
                                    client.connect(host, port, opts);
                                }
                            // eslint-disable-next-line no-empty
                            } catch (error) {
                                node.error(error)
                            }
                        }
                    },
                    disconnect() {
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

                    close() {
                        // this._instances -= 1;
                        // if (this._instances <= 0) {
                        // node.log(`closing connection ~ ${id}`);
                        // client.close();
                        // client = null;
                        // node.log(`deleting connection from pool ~ ${id}`);
                        // delete clients[id];
                        // }
                        // this._instances -= 1;
                        if (client && client.connected) {
                            node.log(`closing connection ~ ${id}`);
                            client.close();
                        }
                        connecting = false;
                    },

                    get connected() {
                        return client && client.connected;
                    },
                    get connectionInfo() {
                        if(client) {
                            const info = {
                                port: client.port,
                                host: client.host,
                                options: {...client.options},
                            }
                            delete info.options.preventAutoReconnect;//not of interest
                            if(client.protocol == "tcp") {
                                info.options.tcp_server_node_no = client.server_node_no;//DA1
                                info.options.tcp_client_node_no = client.client_node_no;//SA1
                            }
                            return info;
                        }            
                        return {}
                    }
                };

                client.on('open', () => {
                    if (client) {
                        node.log(`connected ~ ${id}`);
                        connecting = false;
                    }
                });
                // eslint-disable-next-line no-unused-vars
                client.on('close', (err) => {
                    node.log(`connection closed ~ ${id}`);
                    connecting = false;

                    if (options.autoConnect && !options.preventAutoReconnect) {
                        finsClientConnection.reconnectTimer = setTimeout(() => {
                            if (finsClientConnection.reconnectTimer && options.autoConnect && !options.preventAutoReconnect) {
                                node.log(`autoConnect call from close handler ~ ${id}`);
                                finsClientConnection.connect();
                            }
                        }, 5000); // TODO: Parametrise
                    }
                });

                return finsClientConnection;
            }());
        }

        return clients[id];
    },
    close(connectionConfig) {
        const c = this.get(null, connectionConfig);
        if(c && c.connected) {
            c.close();
        }
        c.close();
        if(c && c.reconnectTimer) {
            clearTimeout(c.reconnectTimer);
            c.reconnectTimer = null;
        }
        if(c) {
            const id = connectionConfig.id;
            delete clients[id];
        }
    }
};

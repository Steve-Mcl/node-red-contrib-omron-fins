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
        let _options = { ...(connectionConfig.options || {}) };
        let _port = parseInt(connectionConfig.port || _options.port);
        let _host = connectionConfig.host || _options.host;
        let _connect = connectionConfig.autoConnect == null ? true : connectionConfig.autoConnect;

        if (!clients[id]) {
            clients[id] = (function (port, host, options, connect) {

                node.log(`Create new FinsClient. id:${id}, config: ${describe(host, port, options)}`);
                let fins_client = fins.FinsClient(port, host, options, false);
                options.autoConnect = options.autoConnect == null ? true : options.autoConnect;
                let connecting = false;
                let preventAutoReconnect = true;

                const finsClientWrapper = {
                    write(address, data, opts, tag) {
                        checkConnection();
                        const _data = convertPayloadToDataArray(data);
                        if (!Array.isArray(_data)) {
                            throw new Error('data is not valid');
                        }
                        return fins_client.write(address, _data, opts, tag);
                    },
                    read(address, len, opts, tag) {
                        checkConnection();
                        return fins_client.read(address, parseInt(len), opts, tag);
                    },
                    readMultiple(addresses, opts, tag) {
                        checkConnection();
                        return fins_client.readMultiple(addresses, opts, tag);
                    },
                    fill(address, value, count, opts, tag) {
                        checkConnection();
                        return fins_client.fill(address, value, parseInt(count), opts, tag);
                    },
                    transfer(srcAddress, dstAddress, count, opts, tag) {
                        checkConnection();
                        return fins_client.transfer(srcAddress, dstAddress, parseInt(count), opts, tag);
                    },
                    status(opts, tag) {
                        checkConnection();
                        return fins_client.status(opts, tag);
                    },
                    run(opts, tag) {
                        checkConnection();
                        return fins_client.run(opts, tag);
                    },
                    stop(opts, tag) {
                        checkConnection();
                        return fins_client.stop(opts, tag);
                    },
                    cpuUnitDataRead(opts, tag) {
                        checkConnection();
                        return fins_client.cpuUnitDataRead(opts, tag);
                    },
                    clockRead(opts, tag) {
                        checkConnection();
                        return fins_client.clockRead(opts, tag);
                    },
                    clockWrite(clock, opts, tag) {
                        checkConnection();
                        return fins_client.clockWrite(clock, opts, tag);
                    },
                    on(a, b) {
                        fins_client.on(a, b);
                    },
                    connect(host, port, opts) {
                        preventAutoReconnect = false;
                        finsClientWrapper.reconnect(host, port, opts);
                    },
                    reconnect(host, port, opts) {
                        if (!fins_client.connected && !connecting) {
                            try {
                                node.log(`Connecting id:${id}, config: ${describe(finsClientWrapper.connectionInfo.host, finsClientWrapper.connectionInfo.port, finsClientWrapper.connectionInfo.options)}`);
                            // eslint-disable-next-line no-empty
                            } catch (error) { }
                            
                            try {
                                fins_client.connect(host, port, opts);
                                connecting = true;
                                finsClientWrapper.reconnectTimeOver = setTimeout(() => {
                                    connecting = false;
                                    finsClientWrapper.reconnectTimeOver = null;
                                }, 8000);

                            // eslint-disable-next-line no-empty
                            } catch (error) {
                                node.error(error)
                            }
                        }
                    },
                    disconnect() {
                        preventAutoReconnect = true;
                        if (fins_client) {
                            fins_client.disconnect();
                        }
                        connecting = false;
                    },
                    stringToFinsAddress(addressString) {
                        return fins_client.stringToFinsAddress(addressString);
                    },

                    FinsAddressToString(decodedAddress, offsetWD, offsetBit) {
                        return fins_client.FinsAddressToString(decodedAddress, offsetWD, offsetBit);
                    },

                    close() {
                        connecting = false;
                        if (fins_client && fins_client.connected) {
                            node.log(`closing connection ~ ${id}`);
                            fins_client.disconnect();
                        }
                    },

                    get connected() {
                        return fins_client && fins_client.connected;
                    },

                    get connectionInfo() {
                        if(fins_client) {
                            const info = {
                                port: fins_client.port,
                                host: fins_client.host,
                                options: {...fins_client.options},
                            }
                            if(fins_client.protocol == "tcp") {
                                info.options.tcp_server_node_no = fins_client.server_node_no;//DA1
                                info.options.tcp_client_node_no = fins_client.client_node_no;//SA1
                            }
                            return info;
                        }            
                        return {}
                    }
                };

                fins_client.on('open', () => {
                    try {
                        connecting = false;
                        if (finsClientWrapper.reconnectTimer) {
                            clearTimeout(finsClientWrapper.reconnectTimer);
                            finsClientWrapper.reconnectTimer = null;
                        }
                        node.log(`connected ~ ${id}`);
                        // eslint-disable-next-line no-empty
                    } catch (error) { }
                });

                // eslint-disable-next-line no-unused-vars
                fins_client.on('close', (err) => {
                    try {
                        connecting = false;
                        node.log(`connection closed ~ ${id}`);
                        scheduleReconnect();
                        // eslint-disable-next-line no-empty
                    } catch (error) { }
                });

                function checkConnection() {
                    if (!finsClientWrapper.connected) {
                        if (!preventAutoReconnect && !finsClientWrapper.reconnectTimer) {
                            scheduleReconnect();
                        }
                        throw new Error('not connected');
                    }
                }

                function scheduleReconnect() {
                    if(!connecting) {
                        if (!finsClientWrapper.reconnectTimer && options.autoConnect && !preventAutoReconnect) {
                            finsClientWrapper.reconnectTimer = setTimeout(() => {
                                if (finsClientWrapper.reconnectTimer && options.autoConnect && !preventAutoReconnect) {
                                    finsClientWrapper.reconnectTimer = null;
                                    node.log(`Scheduled reconnect ~ ${id}`);
                                    finsClientWrapper.reconnect();
                                }
                            }, 2000); // TODO: Parametrise
                        }
                    }
                }

                if(connect) {
                    finsClientWrapper.connect();
                }
                return finsClientWrapper;

            }(_port, _host, _options, _connect));
        }
        return clients[id];
    },
    close(connectionConfig) {
        const cli = this.get(null, connectionConfig);
        if(cli) {
            if(cli.reconnectTimer) {
                clearTimeout(cli.reconnectTimer);
                cli.reconnectTimer = null;
            }
            if(cli.connected) {
                cli.close();
            }
        }
        const id = connectionConfig.id;
        delete clients[id];
    }
};

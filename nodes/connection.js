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

const {FinsConstants: constants, FinsDataUtils: {isInt}} = require('omron-fins');
const connection_pool = require('../connection_pool.js');

module.exports = function (RED) {

    /*!
    * Get value of environment variable.
    * @param {RED} _RED - accessing RED object
    * @param {String} name - name of variable
    * @return {String} value of env var / setting
    */
    function getSetting(name) {
        let result = RED.util.getObjectProperty(RED.settings, name);
        return result || process.env[name];
    }

    /**
     * Checks if a String contains any Environment Variable specifiers and returns
     * it with their values substituted in place.
     *
     * For example, if the env var `WHO` is set to `Joe`, the string `Hello ${WHO}!`
     * will return `Hello Joe!`.
     * @param  {String} value - the string to parse
     * @param  {Node} node - the node evaluating the property
     * @return {String} The parsed string
     */
    function resolveSetting(value) {
        try {
            if (!value) return value;
            if (typeof value != "string") return value;
            let result;
            if (/^\${[^}]+}$/.test(value)) {
                // ${ENV_VAR}
                let name = value.substring(2, value.length - 1);
                result = getSetting(name);
            } else {
                // FOO${ENV_VAR}BAR
                result = value.replace(/\${([^}]+)}/g, function (match, name) {
                    return getSetting(name);
                });
            }
            return (result == null) ? value : result;
        } catch (error) {
            return value;
        }
    }

    function omronConnection(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.host = resolveSetting(config.host);
        this.port = resolveSetting(config.port);
        this.options = {};
        this.options.MODE = 'CJ';
        this.options.protocol = 'udp';
        if (config.protocolType == "env") {
            this.options.protocol = '';
            if(config.protocol) this.options.protocol = getSetting(config.protocol);
        } else {
            this.options.protocol = config.protocolType || "udp";
        }
        if(!config.MODEType && (config.MODE == 'CSCJ' || config.MODE == 'NJNX' || config.MODE == 'CV')) {
            config.MODEType = config.MODE.substr(0,2);
        }
        if (config.MODEType == 'env') {
            if(config.MODE) this.options.MODE = getSetting(config.MODE);
        } else {
            this.options.MODE = config.MODEType || 'CJ';
        }
        if(this.options.MODE) this.options.MODE = this.options.MODE.substr(0,2);
        this.options.ICF = isInt(resolveSetting(config.ICF), constants.DefaultFinsHeader.ICF);
        this.options.DNA = isInt(resolveSetting(config.DNA), constants.DefaultFinsHeader.DNA);
        this.options.DA1 = isInt(resolveSetting(config.DA1), constants.DefaultFinsHeader.DA1);
        this.options.DA2 = isInt(resolveSetting(config.DA2), constants.DefaultFinsHeader.DA2);
        this.options.SNA = isInt(resolveSetting(config.SNA), constants.DefaultFinsHeader.SNA);
        this.options.SA1 = isInt(resolveSetting(config.SA1), constants.DefaultFinsHeader.SA1);
        this.options.SA2 = isInt(resolveSetting(config.SA2), constants.DefaultFinsHeader.SA2);
        this.autoConnect = config.autoConnect == null ? true : config.autoConnect;

        // eslint-disable-next-line no-unused-vars
        this.on('close', function (done) {
            try {
                connection_pool.close(this, this);
                done && done();
            // eslint-disable-next-line no-empty
            } catch (error) { }
        });
    }
    RED.nodes.registerType("FINS Connection", omronConnection);
};


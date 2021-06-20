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

var constants = require('omron-fins').FinsConstants;

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

/*!
 * Get value of environment variable.
 * @param {RED} _RED - accessing RED object
 * @param {String} name - name of variable
 * @return {String} value of env var / setting
 */
function getSetting(_RED, name) {
  var result = _RED.util.getObjectProperty(_RED.settings, name);
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
function resolveSetting(value, RED) {
  try {
    if(!value) return value;
    if(typeof value != "string") return value;
    var result;
    if (/^\${[^}]+}$/.test(value)) {
        // ${ENV_VAR}
        var name = value.substring(2,value.length-1);
        result = getSetting(RED, name);
    } else {
        // FOO${ENV_VAR}BAR
        result = value.replace(/\${([^}]+)}/g, function(match, name) {
          return getSetting(RED, name);
        });
    }
    return (result == null)?value:result;
  } catch (error) {
    return value;
  }
  
}

module.exports = function (RED) {
  function omronConnection(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.host = resolveSetting(config.host, RED);
    this.port = resolveSetting(config.port, RED);
    this.options = {};
    this.options.MODE = config.MODE ? config.MODE : "CSCJ";
    this.options.ICF = isInt(resolveSetting(config.ICF, RED), constants.DefaultFinsHeader.ICF);
    this.options.DNA = isInt(resolveSetting(config.DNA, RED), constants.DefaultFinsHeader.DNA);
    this.options.DA1 = isInt(resolveSetting(config.DA1, RED), constants.DefaultFinsHeader.DA1);
    this.options.DA2 = isInt(resolveSetting(config.DA2, RED), constants.DefaultFinsHeader.DA2);
    this.options.SNA = isInt(resolveSetting(config.SNA, RED), constants.DefaultFinsHeader.SNA);
    this.options.SA1 = isInt(resolveSetting(config.SA1, RED), constants.DefaultFinsHeader.SA1);
    this.options.SA2 = isInt(resolveSetting(config.SA2, RED), constants.DefaultFinsHeader.SA2);

  }
  RED.nodes.registerType("FINS Connection", omronConnection);
};


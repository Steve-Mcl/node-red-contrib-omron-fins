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

module.exports = function (RED) {
  function omronConnection(config) {
    RED.nodes.createNode(this, config);

    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.options = {};
    this.options.MODE = config.MODE ? config.MODE : "CSCJ";
    this.options.ICF = isInt(config.ICF, constants.DefaultFinsHeader.ICF);
    this.options.DNA = isInt(config.DNA, constants.DefaultFinsHeader.DNA);
    this.options.DA1 = isInt(config.DA1, constants.DefaultFinsHeader.DA1);
    this.options.DA2 = isInt(config.DA2, constants.DefaultFinsHeader.DA2);
    this.options.SNA = isInt(config.SNA, constants.DefaultFinsHeader.SNA);
    this.options.SA1 = isInt(config.SA1, constants.DefaultFinsHeader.SA1);
    this.options.SA2 = isInt(config.SA2, constants.DefaultFinsHeader.SA2);

  }
  RED.nodes.registerType("FINS Connection", omronConnection);
};


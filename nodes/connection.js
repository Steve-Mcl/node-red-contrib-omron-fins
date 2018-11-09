var constants = require('../constants');

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


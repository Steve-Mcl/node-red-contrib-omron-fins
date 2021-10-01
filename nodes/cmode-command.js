module.exports = function (RED) {
    const C_MODE = require("./_cmode.js");
 
    function OmronCModeCommand(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        /** @type {string} */ 
        node.plcSeries = config.plcSeries || "CSJP";
        // node.hostlinkFormat = config.hostlinkFormat || "1:n"; //future, handle 1:1
        node.hostNumber = config.hostNumber;
        node.headerCode = config.headerCode;
        node.p1 = config.p1;
        node.p2 = config.p2;
        node.p3 = config.p3;
        node.noOfWord = config.noOfWord;
        const cmode = new C_MODE.CModeHelper(node.plcSeries);

        node.on('input', function (msg) {
            const cModeCommand = {timestamp: Date.now()};
            cModeCommand.plcSeries = node.plcSeries;
            cModeCommand.header = '@';
            cModeCommand.hostNumber = (node.hostNumber || msg.hostNumber) || "00";
            cModeCommand.headerCode = node.headerCode || msg.headerCode;
            cModeCommand.p1 = node.p1 || msg.p1;
            cModeCommand.p2 = node.p2 || msg.p2;
            cModeCommand.p3 = node.p3 || msg.p3;
            cModeCommand.params = [];
            const commandParamValues = []

            const command = cmode.getCommand(cModeCommand.headerCode);
            if(command) {
                for (let index = 0; index < command.request.length; index++) {
                    const param = { ...command.request[index] };
                    const paramNo = index + 1;
                    const paramId = "p" + paramNo;
                    const paramValue = cModeCommand[paramId];
                    if(param.required && paramValue == null) {
                        throw new Error(`Param ${paramId} (${param.name}) is required`)
                    }
                    if(param.required === false && paramValue == null) {
                        continue;
                    }
                    param.value = paramValue;
                    cModeCommand.params.push(param);
                    commandParamValues.push(param.value);
                }
            } else {
                for (let index = 0; index < 3; index++) {
                    const value = cModeCommand["p"+(index+1)];
                    if(value) {
                        cModeCommand.params.push({
                            name: "unknown",
                            value: value
                        });
                        commandParamValues.push(value);
                    }
                }
            }

            msg.payload = cmode.buildCommand(cModeCommand.hostNumber, cModeCommand.headerCode, ...commandParamValues);
            msg.cModeCommand = cModeCommand;
            node.send(msg);
        });
    }
    RED.nodes.registerType('C-Mode Command', OmronCModeCommand);
};

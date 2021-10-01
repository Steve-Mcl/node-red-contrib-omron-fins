const terminator = '*\r';
const delimiter = '\r'; 

const FRAME_MULTILINK_CSJP = {
    firstFrame: {
        /** Full length from @ to CR */
        maxLength: 127 
    },
    intermediateFrame: {
        /** Full length from start to CR */
        maxLength: 124
    }
}
const FRAME_MULTILINK_CV = {
    firstFrame: {
        /** Full length from @ to CR */
        maxLength: 131 
    },
    intermediateFrame: {
        /** Full length from start to CR */
        maxLength: 128
    }
}
const FRAME_MULTILINK_Calpha = {
    firstFrame: {
        /** Full length from @ to CR */
        maxLength: 127 
    },
    intermediateFrame: {
        /** Full length from start to CR */
        maxLength: 124
    }
}

const FRAME_MULTILINK = {
    Calpha: FRAME_MULTILINK_Calpha,
    CV: FRAME_MULTILINK_CV,
    CSJP: FRAME_MULTILINK_CSJP,
}

const COMMANDS_Calpha = [
    {
        headerCode: "RR",
        name: "IR AREA READ – – RR",
        hint: "Reads the contents of the specified number of CIO words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word"},
            {name: "Length", type: "bcd4", min: 1, max: 6144, required: true, hint: "Number of words"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RH",
        name: "HR AREA READ – – RH",
        hint: "Reads the contents of the specified number of CIO words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word"},
            {name: "Length", type: "bcd4", min: 1, max: 6144, required: true, hint: "Number of words"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
]
const COMMANDS_CV = [
    {
        headerCode: "RR",
        name: "CIO AREA READ – – RR",
        hint: "Reads the contents of the specified number of CIO words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word 0 to 2555"},
            {name: "Length", type: "bcd4", min: 1, max: 2556, required: true, hint: "Number of words 1 to 2556"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RL",
        name: "LR AREA READ – – RL",
        hint: "Treats CIO 1000 to CIO 1063 as a data link area and reads the contents of the specified number of words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 63, required: true, hint: "Beginning Word 0 to 63"},
            {name: "Length", type: "bcd4", min: 1, max: 64, required: true, hint: "Number of words 1 to 64"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RH",
        name: "HR AREA READ – – RH",
        hint: "Treats CIO 1200 to CIO 1299 as a data Holding Area and reads the contents of the specified number of words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning Word 0 to 99"},
            {name: "Length", type: "bcd4", min: 1, max: 100, required: true, hint: "Number of words 1 to 100"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC"}],
    },


]
const COMMANDS_CSJP = [
    {
        headerCode: "RR",
        name: "CIO AREA READ – – RR",
        hint: "Reads the contents of the specified number of CIO words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word 0 to 6143"},
            {name: "Length", type: "bcd4", min: 1, max: 6144, required: true, hint: "Number of words 1 to 6144"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RL",
        name: "LR AREA READ – – RL",
        hint: "Treats CIO 1000 to CIO 1199 as a data link area and reads the contents of the specified number of words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 199, required: true, hint: "Beginning Word 0 to 199"},
            {name: "Length", type: "bcd4", min: 1, max: 200, required: true, hint: "Number of words 1 to 200"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RH",
        name: "HR AREA READ – – RH",
        hint: "Reads the contents of the specified number of HR words starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 511, required: true, hint: "Beginning Word 0 to 511"},
            {name: "Length", type: "bcd4", min: 1, max: 512, required: true, hint: "Number of words 1 to 512"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RC",
        name: "TIMER/COUNTER PV READ – – RC",
        hint: "Reads the contents of the specified number of timer/counter PVs (present values T0000 to T2047 or C0000 to C2047) starting from the specified timer/counter",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 4095, required: true, hint: "Beginning Word: Timer 0~2047 use 0~2047, Counter 0~2047 use 2047~4095"},
            {name: "Length", type: "bcd4", min: 1, max: 2048, required: true, hint: "Number of words 1 to 2048"}
        ],
        response: [{name: "data", type: "bcd4[]", min: 1, max: 2048, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RG",
        name: "TIMER/COUNTER STATUS READ – – RG",
        hint: "Reads the ON/OFF status of the Completion Flags of the specified number of timers/counters starting from the designated word (T0000 to T2047 or C0000 to C2047).",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 4095, required: true, hint: "Beginning Word: Timer 0~2047 use 0~2047, Counter 0~2047 use 2047~4095"},
            {name: "Length", type: "bcd4", min: 1, max: 2048, required: true, hint: "Number of words 1 to 2048"}
        ],
        response: [{name: "data", type: "bool[]", min: 1, max: 2048, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RD",
        name: "DM AREA READ – – RD",
        hint: "Reads the contents of the specified number of DM words starting from the specified word (D00000 to D09999)",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 9999, required: true, hint: "Beginning Word 0 to 9999"},
            {name: "Length", type: "bcd4", min: 1, max: 9999, required: true, hint: "Number of words 1 to 9999"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RE",
        name: "EM AREA READ – – RE",
        hint: "Reads the contents of the specified number of EM words (E00000 to E09999) starting from the specified word in the specified EM bank",
        request: [
            {name: "Bank", type: "uint", min: 0, max: 0xc, required: true, hint: "Bank No 0 to 12 (bank 0 ~ bank C)"},
            {name: "Address", type: "bcd4", min: 0, max: 9999, required: true, hint: "Beginning Word 0 to 9999"},
            {name: "Length", type: "bcd4", min: 1, max: 9999, required: true, hint: "Number of words 1 to 9999"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },
    {
        headerCode: "RJ",
        name: "AR AREA READ – – RJ",
        hint: "Reads the contents of the specified number of Auxiliary Area words (A000 to A959) starting from the specified word",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 959, required: true, hint: "Beginning Word 0 to 959"},
            {name: "Length", type: "bcd4", min: 1, max: 960, required: true, hint: "Number of words 1 to 960"}
        ],
        response: [{name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC"}],
    },


    {
        headerCode: "WR",
        name: "CIO AREA WRITE – – WR",
        hint: "Writes data to the CIO Area (CIO 0000 to CIO 6143) starting from the specified word. Writing is done in word units",
        request: [
            {name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word 0 to 6143"},
            {name: "data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Write data (single or array)"}
        ],
        response: [],
    },



    {
        headerCode: "TS",
        name: "TEST",
        hint: "Returns, unaltered, one block of data transmitted from the host computer",
        request: [{name: "data", type: "str", min: 1, max: 118, required: true, hint: "Any characters other than the carriage return"}],
        response: [
            {
                name: "data", type: "str", min: 1, max: 118, required: true, hint: "The same characters specified in the command will be returned unaltered if the test is successful",
                parser: e => {
                    return Buffer.from(e, "hex").toString();
                }
            }
        ],
    },

    {
        headerCode: "MM",
        name: "PLC MODEL READ – – MM",
        hint: "Reads the model code of the CPU Unit",
        request: [],
        response: [
            {
                name: "data", type: "str", length: 2, required: true, hint: "The model code of the CPU Unit",
                parser: e => { 
                    return {
                        code: e,
                        model: MODEL_CODES[e] || "Unknown"
                    }
                }
            }
        ],
    },
]
const COMMANDS = {
    Calpha: COMMANDS_Calpha,
    CV: COMMANDS_CV,
    CSJP: COMMANDS_CSJP,
}
const MODEL_CODES = {
    "30": "CS/CJ",
    "01": "C250",
    "02": "C500",
    "03": "C120/C50",
    "09": "C250F",
    "0A": "C500F",
    "0B": "C120F",
    "0E": "C2000",
    "10": "C1000H",
    "11": "C2000H/CQM1/CPM1",
    "12": "C20H/C28H/C40H, C200H, C200HS, C200HX/HG/HE (-ZE)",
    "20": "CV500",
    "21": "CV1000",
    "22": "CV2000",
    "40": "CVM1-CPU01-E",
    "41": "CVM1-CPU11-E",
    "42": "CVM1-CPU21-E",
}

const END_CODES = {
    "00": "Normal completion",
    "01": "Not executable in RUN mode",
    "02": "Not executable in MONITOR mode",
    "03": "Not executable, UM write-protected / PROM mounted",
    "04": "Address over",
    "0B": "Not executable in PROGRAM mode",
    "0C": "Not executable in DEBUG mode",//CV
    "10": "Parity error",//Ca, CV
    "11": "Framing error",//Ca, CV
    "12": "Overrun error",//Ca, CV
    "13": "FCS error",
    "14": "Format error. Check the format and transfer the command again",
    "15": "Entry number data error. Correct the data and transfer the command again",
    "16": "Command not supported",
    "18": "Frame length error",
    "19": "Not executable",
    "20": "Could not create I/O table",
    "21": "Not executable due to CPU Unit CPU error",
    "22": "The designated memory does not exist",//CV
    "23": "User memory protected",
    "A0": "Aborted due to parity error in transmission data",//Ca, CV
    "A1": "Aborted due to framing error in transmission data",//Ca, CV
    "A2": "Aborted due to overrun error in transmission data",//Ca, CV
    "A3": "Aborted due to FCS error in transmission data",
    "A4": "Aborted due to format error in transmission data",
    "A5": "Aborted due to entry number data error in transmission data",
    "A8": "Aborted due to frame length error in transmission data",
    "B0": "Not executed due to the program area",//CV
}

/**
 * Get details and helper functions related to the specific type of PLC
 * @param {("CSJP"|"CV"|"Calpha")} plcSeries must be one of CSJP | CV | Calpha 
 * @returns new CModeHelper
 */
function CModeHelper(plcSeries) {
    
    if(!COMMANDS[plcSeries] || !FRAME_MULTILINK[plcSeries]) {
        throw new Error(`plc type not supported`)
    }
    const commands = JSON.parse(JSON.stringify(COMMANDS[plcSeries]));
    const frame = JSON.parse(JSON.stringify(FRAME_MULTILINK[plcSeries]));
    const model_codes = JSON.parse(JSON.stringify(MODEL_CODES)); 
    const end_codes = JSON.parse(JSON.stringify(END_CODES));

    return {       
        get delimiter() {
            return delimiter;
        },
        get terminator() {
            return terminator;
        },
        get frame() {
            return frame;
        },
        get end_codes() {
            return end_codes;
        },
        get model_codes() {
            return model_codes;
        },
        get commands() {
            return commands;
        },
        parseEndCode(errorCode) {
            return this.end_codes[errorCode] || "Unknown"
        },
        parseModelCode(modelcode) {
            return {
                code: modelcode,
                model: this.model_codes[modelcode] || "Unknown"
            }
            //return `Error: ${END_CODES[endCode] || "UNKNOWN"} (End Code '${endCode}')`
        },
        getCommand(headerCode) {
            const found_command = this.commands.find(e => e.headerCode == headerCode);
            //const found_command = this.commands.filter(e => e.headerCode == headerCode);
            //TODO: handle multple commands with same headerCode but alternate meaning - e.g. MS
            //if(!found_command || !found_command.length) {
            if(!found_command) {
                return {
                    headerCode: headerCode,
                    name: "UNKNOWN – – " + headerCode,
                    hint: "Unknown header code " + headerCode,
                    request: [],
                    response: []
                }    
            }
            return found_command
        },
        buildCommand(hostNumber, headerCode, ...params) {
            //TODO: handle commands not explicitly supported
            const cmd = this.getCommand(headerCode);

            //const paramCount = params.length;
            // if(cmd) {
            //     if(paramCount != cmd.request.length) {
            //         throw new Error("Invalid number of parameters supplied for header code ${hostNumber}")
            //     }
            // }

            //todo: rename/refactor
            const f = function formatString (str, length, padChar) {
                str = "" + str;
                if(str.length < length) {
                    str = str.padStart(length, padChar)
                }
                return str.substr(0, length);
            }

            const expectedParams = cmd.request;
            const commandParamsArr = [];
            for (let index = 0; index < expectedParams.length; index++) {
                const ep = expectedParams[index];
                let pv = params[index];
                let v = pv;
                switch (ep.type) {
                case "bcd4":
                    //TODO: min/max/isNumeric tests
                    v = f(v, 4, "0");
                    break;
                case "uint":
                    //TODO: min/max/isNumeric tests
                    v = f(parseInt(v).toString(16), 4, "0");
                    break;
                case "uint[]":
                    //TODO: min/max/isNumeric tests
                    if (!Array.isArray(v)) { v = [v]; }
                    v = v.map(e => f(parseInt(e).toString(16), 4, "0"));
                    v = v.join("");
                    break;

                default:
                    break;
                }
                commandParamsArr.push(v);
            }
            const commandParams = commandParamsArr.join("");
            const command = ['@', f(hostNumber, 2, "0"), f(headerCode, 2, "0"), commandParams].join("");
            /* TODO: break request up if greater than frame max length
            const commandLength = command.length;
            const macLenFF = this.frame.firstFrame.maxLength;
            const macLenIF = this.frame.intermediateFrame.maxLength;
            */
            const FCS = CModeHelper.prototype.calculateFCS(command);
            let payload = command + FCS + terminator;
            return payload;
        }
    }
}
CModeHelper.prototype.calculateFCS = function(data) {
    let CRC = 0;
    const dataLen = data.length;
    for (let ch = 0; ch <= dataLen; ch++) {
        CRC = data.charCodeAt(ch) ^ CRC;
    }
    const FCS = CRC.toString(16).toUpperCase();
    return FCS;
}

module.exports.terminator = terminator;
module.exports.delimiter = delimiter;
module.exports.COMMANDS = COMMANDS;
module.exports.FRAME_MULTILINK = FRAME_MULTILINK;
// module.exports.FRAME_SINGLELINK = FRAME_SINGLELINK; //future?
module.exports.MODEL_CODES = MODEL_CODES;
module.exports.END_CODES = END_CODES;
module.exports.CModeHelper = CModeHelper;
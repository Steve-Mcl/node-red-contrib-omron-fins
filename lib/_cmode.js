(function (exports) {

    const terminator = '*\r';
    const delimiter = '\r';

    /**
    * number2bcd -> takes a bcd number and returns the corresponding decimal value
    * @param {Number} number BCD number to convert
    * @param {*} digits no of digits (default 4)
    */
    // eslint-disable-next-line no-unused-vars
    const bcd2number = function (number, digits = 4) {
        let loByte = (number & 0x00ff);
        let hiByte = (number >> 8) & 0x00ff;
        let n = 0;
        n += (loByte & 0x0F) * 1;
        if (digits < 2) return n;
        n += ((loByte >> 4) & 0x0F) * 10;
        if (digits < 3) return n;
        n += (hiByte & 0x0F) * 100;
        if (digits < 4) return n;
        n += ((hiByte >> 4) & 0x0F) * 1000;
        return n;
    }


    /**
        * number2bcd -> takes a number and returns the corresponding BCD value.
        * @param {Number} number number to convert to bcd
        * @param {Number} [digits] no of digits (default 4)
        * @returns {Buffer} nodejs buffer 
        */
    const number2bcd = function (number, digits) {
        var s = digits || 4; //default value: 4
        var n = 0;

        n = (number % 10);
        number = (number / 10) | 0;
        if (s < 2) return n;
        n += (number % 10) << 4;
        number = (number / 10) | 0;
        if (s < 3) return n;
        n += (number % 10) << 8;
        number = (number / 10) | 0;
        if (s < 4) return n;
        n += (number % 10) << 12;
        number = (number / 10) | 0;
        return n;
    }

    const to_uint16_parser = (buf) => {
        // eslint-disable-next-line no-debugger
        debugger
        let buffer;
        if (typeof buf === "string") {
            buffer = Buffer.from(buf, "hex");
        } else {
            buffer = Buffer.from(buf)
        }
        const uint16array = new Uint16Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.length / Uint16Array.BYTES_PER_ELEMENT);
        return uint16array
    }

    const to_bcd16_parser = (buf) => {
        // eslint-disable-next-line no-debugger
        debugger
        let buffer;
        if (typeof buf === "string") {
            buffer = Buffer.from(buf, "hex");
        } else {
            buffer = Buffer.from(buf)
        }
        const uint16array = new Uint16Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.length / Uint16Array.BYTES_PER_ELEMENT);
        return uint16array.map(e => number2bcd(e))
    }
    
    // eslint-disable-next-line no-unused-vars
    const xxxbyte_to_bool_parser = (buf) => {
        // eslint-disable-next-line no-debugger
        debugger
        let buffer;
        if (typeof buf === "string") {
            buffer = Buffer.from(buf, "hex");
        } else {
            buffer = Buffer.from(buf)
        }
        const uint16array = new Uint16Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.length / Uint16Array.BYTES_PER_ELEMENT);

        const bits = uint16array.map(word => {
            return {
                wordValue: word,
                bit0: (word & Math.pow(2, 0)) >> 0,
                bit1: (word & Math.pow(2, 1)) >> 1,
                bit2: (word & Math.pow(2, 2)) >> 2,
                bit3: (word & Math.pow(2, 3)) >> 3,
                bit4: (word & Math.pow(2, 4)) >> 4,
                bit5: (word & Math.pow(2, 5)) >> 5,
                bit6: (word & Math.pow(2, 6)) >> 6,
                bit7: (word & Math.pow(2, 7)) >> 7,
                bit8: (word & Math.pow(2, 8)) >> 8,
                bit9: (word & Math.pow(2, 9)) >> 9,
                bit10: (word & Math.pow(2, 10)) >> 10,
                bit11: (word & Math.pow(2, 11)) >> 11,
                bit12: (word & Math.pow(2, 12)) >> 12,
                bit13: (word & Math.pow(2, 13)) >> 13,
                bit14: (word & Math.pow(2, 14)) >> 14,
                bit15: (word & Math.pow(2, 15)) >> 15,
            }
        })
        return bits
    }
    const byte_to_bool_parser = (buf) => {
        // eslint-disable-next-line no-debugger
        debugger
        let buffer;
        if (typeof buf === "string") {
            buffer = Buffer.from(buf, "hex");
        } else {
            buffer = Buffer.from(buf)
        }
        let bits = [];
        buffer.forEach(e => {
            bits.push(!!e)
        })
        return bits
    }

    const to_string_parser = (buf) => {
        return Buffer.from(buf, "hex").toString();
    }

    const model_code_parser = (code) => {
        // eslint-disable-next-line no-debugger
        debugger
        return {
            code: code,
            model: MODEL_CODES[code] || "Unknown"
        }
    }

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
            name: "IR AREA READ - RR",
            hint: "Reads the contents of the specified number of IR and SR words, starting from the specified word.",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 511, required: true, hint: "Beginning Word (0 to 511)" },
                { name: "Length", type: "bcd4", min: 1, max: 512, required: true, hint: "Number of words (1 to 512)" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RL",
            name: "HR AREA READ - RL",
            hint: "Reads the contents of the specified number of LR words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RH",
            name: "HR AREA READ - RH",
            hint: "Reads the contents of the specified number of HR words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },

        { 
            headerCode: "RC", 
            name:  "PV READ - RC", 
            hint: "Reads the contents of the specified number of timer/counter PVs (present values), starting from the specified timer/counter",
            request: [
                { name: "Address", type: "bcd4", required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "bcd[]", required: true, hint: "Data read from PLC", parser: to_bcd16_parser }],
        },
        { 
            headerCode: "RG", 
            name:  "TC STATUS READ - RG", 
            hint: "Reads the status of the Completion Flags of the specified number of timers/counters, starting from the specified timer/counter",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 511, required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", min: 1, max: 512, required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "bool[]", required: true, hint: "Data read from PLC", parser: byte_to_bool_parser }],
        },
        { 
            headerCode: "RD", 
            name:  "DM AREA READ - RD", 
            hint: "Reads the contents of the specified number of DM words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 9999, required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", min: 1, max: 10000, required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        { 
            headerCode: "RJ", 
            name:  "AR AREA READ - RJ", 
            hint: "Reads the contents of the specified number of AR words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 27, required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", min: 1, max: 28, required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        { 
            headerCode: "RE", 
            name:  "EM AREA READ - RE", 
            hint: "Reads the contents of the specified number of EM words, starting from the specified word in the specified EM bank",
            request: [
                { name: "Bank", type: "int", min: 0, max: 2, required: true, hint: "Bank No. Input 00, 01, or 02 to specify bank number 0, 1, or 2. Input two spaces to specify the current bank" },
                { name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", min: 1, max: 6144, required: true, hint: "Number of words" }
            ],
            response: [{ name: "Data", type: "uint[]", required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        { 
            headerCode: "WR", 
            name:  "IR/SR AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "WL", 
            name:  "LR AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "WH", 
            name:  "HR AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "WC", 
            name:  "PV WRITE", 
            hint: "",
        },
        { 
            headerCode: "WG", 
            name:  "TC STATUS WRITE", 
            hint: "",
        },
        { 
            headerCode: "WD", 
            name:  "DM AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "WJ", 
            name:  "AR AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "WE", 
            name:  "EM AREA WRITE", 
            hint: "",
        },
        { 
            headerCode: "MS", 
            name:  "STATUS READ", 
            hint: "",
        },
        { 
            headerCode: "SC", 
            name:  "STATUS WRITE", 
            hint: "",
        },
        { 
            headerCode: "MM", 
            name:  "PC MODEL READ", 
            hint: "",
        },
        { 
            headerCode: "TS", 
            name:  "TEST", 
            hint: "",
        }
    ]

    const COMMANDS_CV = [
        {
            headerCode: "RR",
            name: "CIO AREA READ - RR",
            hint: "Reads the contents of the specified number of CIO words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word 0 to 2555" },
                { name: "Length", type: "bcd4", min: 1, max: 2556, required: true, hint: "Number of words 1 to 2556" }
            ],
            response: [
                { name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }
            ],
        },
        {
            headerCode: "RL",
            name: "LR AREA READ - RL",
            hint: "Treats CIO 1000 to CIO 1063 as a data link area and reads the contents of the specified number of words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 63, required: true, hint: "Beginning Word 0 to 63" },
                { name: "Length", type: "bcd4", min: 1, max: 64, required: true, hint: "Number of words 1 to 64" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RH",
            name: "HR AREA READ - RH",
            hint: "Treats CIO 1200 to CIO 1299 as a data Holding Area and reads the contents of the specified number of words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning Word 0 to 99" },
                { name: "Length", type: "bcd4", min: 1, max: 100, required: true, hint: "Number of words 1 to 100" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            "headerCode": "RR", 
            name: "CIO AREA READ - RR",
            hint: "Reads the contents of the specified number of CIO words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word 0 to 2555" },
                { name: "Length", type: "bcd4", min: 1, max: 2556, required: true, hint: "Number of words 1 to 2556" }
            ],
            response: [
                { name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }
            ],
        },
        {
            "headerCode": "RL", 
            name: "LR AREA READ - RL",
            hint: "Treats CIO 1000 to CIO 1063 as a data link area and reads the contents of the specified number of words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 63, required: true, hint: "Beginning Word 0 to 63" },
                { name: "Length", type: "bcd4", min: 1, max: 64, required: true, hint: "Number of words 1 to 64" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            "headerCode": "RH", 
            name: "HR AREA READ - RH",
            hint: "Reads the contents of the specified number of Holding Area words (CIO 1200 to CIO 1299), starting from the specified offset from the beginning of the area",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning Word 0 to 99" },
                { name: "Length", type: "bcd4", min: 1, max: 100, required: true, hint: "Number of words 1 to 100" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            "headerCode": "RC", 
            "name": "PV READ - RC",
            "hint": "Reads the specified number of timer/counter PVs (present values) starting from the specified timer/counter",
            "request": [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning timer/counter" },
                { name: "Length", type: "bcd4", min: 1, max: 100, required: true, hint: "Number of timer/counter" }
            ],
            response: [{ name: "Data", type: "bcd[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_bcd16_parser }],
        },
        {
            "headerCode": "RG", 
            "name": "TC STATUS READ - RG",
            "hint": "Reads the status of the Completion Flags of the specified number of timers/counters starting from the specified timer/counter",
            "request": [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning timer/counter" },
                { name: "Length", type: "bcd4", min: 1, max: 100, required: true, hint: "Number of timer/counter" }
            ],
            response: [{ name: "Data", type: "bool[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: byte_to_bool_parser }],
        },
        {
            "headerCode": "RD", 
            "name": "DM AREA READ - RD",
            hint: "Reads the contents of the specified number of DM words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word" },
                { name: "Length", type: "bcd4", min: 1, max: 2556, required: true, hint: "Number of words" }
            ],
            response: [
                { name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }
            ],
        },
        {
            "headerCode": "RJ", 
            "name": "AUXILIARY AREA READ - RJ",
            hint: "Reads the contents of the specified number of DM words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word 0 to 511" },
                { name: "Length", type: "bcd4", min: 1, max: 2556, required: true, hint: "Number of words 1 to 512" }
            ],
            response: [
                { name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }
            ],
        },

        {
            "headerCode": "WR", 
            "name": "CIO AREA WRITE - WR",
            hint: "Writes data to the CIO Area (CIO 0000 to CIO 2555) starting from the specified word. Writing is done in word units",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 2555, required: true, hint: "Beginning Word 0 to 2555" },
                { name: "Data", type: "uint[]", min: 1, max: 2556, required: true, hint: "Write data (single or array)" }
            ],
            response: [],
        },
        {
            "headerCode": "WL",
            "name": "LINK AREA WRITE - WL",
            hint: "Writes data to the specified number of Link Area words (CIO 1000 to CIO 1063) starting from the specified word. Writing is done in word units",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 63, required: true, hint: "Beginning Word 0 to 63" },
                { name: "Data", type: "uint[]", min: 1, max: 64, required: true, hint: "Write data (single or array)" }
            ],
            response: [],
        },
        {
            "headerCode": "WH", 
            "name": "HOLDING AREA WRITE - WH",
            "hint": "Writes data to the specified number of Holding Area words (CIO 1200 to CIO 1299) starting from the specified word. Writing is done in word units",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning Word 0 to 99" },
                { name: "Data", type: "uint[]", min: 1, max: 100, required: true, hint: "Write data (single or array)" }
            ],
            "response": [],
        },
        {
            "headerCode": "WC", 
            "name": "PV WRITE - WC",
            "hint": "Writes PVs (present values) of timers/counters starting from the specified timer/counter",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 99, required: true, hint: "Beginning timer/counter" },
                { name: "Data", type: "uint[]", min: 1, max: 100, required: true, hint: "Write data (single or array)" }
            ],
            "response": [],
        },
        {
            "headerCode": "WD", 
            "name": "DM AREA WRITE - WD",
            hint: "Writes data to the DM Area starting from the specified word. The data to be written is specified word by word.",
            request: [
                { name: "Address", type: "bcd4", required: true, hint: "Beginning Word" },
                { name: "Data", type: "uint[]", required: true, hint: "Write data (single or array)" }
            ],
            response: [],
        },
        {
            "headerCode": "WJ", 
            "name": "AUXILIARY AREA WRITE - WJ",
            hint: "Writes data to the Auxiliary Area starting from the specified word. The data to be written is specified word by word",
            request: [
                { name: "Address", type: "bcd4", required: true, hint: "Beginning Word" },
                { name: "Data", type: "uint[]", required: true, hint: "Write data (single or array)" }
            ],
            response: [],
        },
        // {
        //     "headerCode": "R#", 
        //     "name":  "SV READ 1",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        // {
        //     "headerCode": "R$", 
        //     "name":  "SV READ 2",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        // {
        //     "headerCode": "R%", 
        //     "name":  "SV READ 3",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        // {
        //     "headerCode": "W#", 
        //     "name":  "SV CHANGE 1",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        // {
        //     "headerCode": "W$", 
        //     "name":  "SV CHANGE 2",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        // {
        //     "headerCode": "W%", 
        //     "name":  "SV CHANGE 3",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
        {
            "headerCode": "MS", 
            "name": "STATUS READ - MS",
            "hint": "Reads the operating status of the PLC",
            request: [
            ],
            response: [
                { 
                    name: "Data", type: "object", hint: "Operating status of PLC", 
                    parser: function(e) {
                        let buffer = Buffer.from(e);
                        let state = buffer.readUInt16BE(0);
                        let mode = (state & 0x0300) >> 8;
                        const modes = ["program", "debug", "monitor", "run"];
                        let message = buffer.slice(1).toString() || "";
                        return {
                            mode: modes[mode],
                            message: message.trim()
                        }
                    } 
                }
            ],
        },
        {
            "headerCode": "SC", 
            "name": "STATUS WRITE - SC",
            "hint": "Changes the operating mode of the PLC",
            request: [
                { name: "Mode", type: "uint", min: 0, max: 3, required: true, hint: "0:program, 1:debug, 2:monitor, 3:run" },
            ],
            response: [
            ],
        },
        // {
        //     "headerCode": "MF", 
        //     "name": "ERROR READ",
        //     "hint": "",
        //     "request": [],
        //     "response": [],
        // },
    ]

    const COMMANDS_CSJP = [
        {
            headerCode: "RR",
            name: "CIO AREA READ - RR",
            hint: "Reads the contents of the specified number of CIO words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word 0 to 6143" },
                { name: "Length", type: "bcd4", min: 1, max: 6144, required: true, hint: "Number of words 1 to 6144" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RL",
            name: "LR AREA READ - RL",
            hint: "Treats CIO 1000 to CIO 1199 as a data link area and reads the contents of the specified number of words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 199, required: true, hint: "Beginning Word 0 to 199" },
                { name: "Length", type: "bcd4", min: 1, max: 200, required: true, hint: "Number of words 1 to 200" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RH",
            name: "HR AREA READ - RH",
            hint: "Reads the contents of the specified number of HR words starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 511, required: true, hint: "Beginning Word 0 to 511" },
                { name: "Length", type: "bcd4", min: 1, max: 512, required: true, hint: "Number of words 1 to 512" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 200, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RC",
            name: "TIMER/COUNTER PV READ - RC",
            hint: "Reads the contents of the specified number of timer/counter PVs (present values T0000 to T2047 or C0000 to C2047) starting from the specified timer/counter",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 4095, required: true, hint: "Beginning Word: Timer 0~2047 use 0~2047, Counter 0~2047 use 2047~4095" },
                { name: "Length", type: "bcd4", min: 1, max: 2048, required: true, hint: "Number of words 1 to 2048" }
            ],
            response: [{ name: "Data", type: "bcd4[]", min: 1, max: 2048, required: true, hint: "Data read from PLC", parser: to_bcd16_parser }],
        },
        {
            headerCode: "RG",
            name: "TIMER/COUNTER STATUS READ - RG",
            hint: "Reads the ON/OFF status of the Completion Flags of the specified number of timers/counters starting from the designated word (T0000 to T2047 or C0000 to C2047).",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 4095, required: true, hint: "Beginning Word: Timer 0~2047 use 0~2047, Counter 0~2047 use 2047~4095" },
                { name: "Length", type: "bcd4", min: 1, max: 2048, required: true, hint: "Number of words 1 to 2048" }
            ],
            response: [{ name: "Data", type: "bool[]", min: 1, max: 2048, required: true, hint: "Data read from PLC", parser: byte_to_bool_parser }],
        },
        {
            headerCode: "RD",
            name: "DM AREA READ - RD",
            hint: "Reads the contents of the specified number of DM words starting from the specified word (D00000 to D09999)",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 9999, required: true, hint: "Beginning Word 0 to 9999" },
                { name: "Length", type: "bcd4", min: 1, max: 9999, required: true, hint: "Number of words 1 to 9999" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RE",
            name: "EM AREA READ - RE",
            hint: "Reads the contents of the specified number of EM words (E00000 to E09999) starting from the specified word in the specified EM bank",
            request: [
                { name: "Bank", type: "uint", min: 0, max: 0xc, required: true, hint: "Bank No 0 to 12 (bank 0 ~ bank C)" },
                { name: "Address", type: "bcd4", min: 0, max: 9999, required: true, hint: "Beginning Word 0 to 9999" },
                { name: "Length", type: "bcd4", min: 1, max: 9999, required: true, hint: "Number of words 1 to 9999" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },
        {
            headerCode: "RJ",
            name: "AR AREA READ - RJ",
            hint: "Reads the contents of the specified number of Auxiliary Area words (A000 to A959) starting from the specified word",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 959, required: true, hint: "Beginning Word 0 to 959" },
                { name: "Length", type: "bcd4", min: 1, max: 960, required: true, hint: "Number of words 1 to 960" }
            ],
            response: [{ name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Data read from PLC", parser: to_uint16_parser }],
        },


        {
            headerCode: "WR",
            name: "CIO AREA WRITE - WR",
            hint: "Writes data to the CIO Area (CIO 0000 to CIO 6143) starting from the specified word. Writing is done in word units",
            request: [
                { name: "Address", type: "bcd4", min: 0, max: 6143, required: true, hint: "Beginning Word 0 to 6143" },
                { name: "Data", type: "uint[]", min: 1, max: 6144, required: true, hint: "Write data (single or array)" }
            ],
            response: [],
        },



        {
            headerCode: "TS",
            name: "TEST - TS",
            hint: "Returns, unaltered, one block of data transmitted from the host computer",
            request: [{ name: "Data", type: "str", min: 1, max: 118, required: true, hint: "Any characters other than the carriage return" }],
            response: [
                {
                    name: "Data", type: "str", min: 1, max: 118, required: true, hint: "The same characters specified in the command will be returned unaltered if the test is successful",
                    parser: to_string_parser
                }
            ],
        },

        {
            headerCode: "MM",
            name: "PLC MODEL READ - MM",
            hint: "Reads the model code of the CPU Unit",
            request: [],
            response: [
                {
                    name: "Data", type: "str", length: 2, required: true, hint: "The model code of the CPU Unit",
                    parser: model_code_parser
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

        if (!COMMANDS[plcSeries] || !FRAME_MULTILINK[plcSeries]) {
            throw new Error(`plc type not supported`)
        }
        // const commands = JSON.parse(JSON.stringify(COMMANDS[plcSeries]));
        const commands = COMMANDS[plcSeries];
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
                //TODO: handle multiple commands with same headerCode but alternate meaning - e.g. MS
                //const found_command = this.commands.filter(e => e.headerCode == headerCode);
                //if(!found_command || !found_command.length) {
                
                const found_command = this.commands.find(e => e.headerCode == headerCode);
                // if (!found_command) {
                //     return {
                //         headerCode: headerCode,
                //         name: "UNKNOWN - " + headerCode,
                //         hint: "Unknown header code " + headerCode,
                //         request: [],
                //         response: []
                //     }
                // }
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
                const f = function formatString(str, length, padChar) {
                    str = "" + str;
                    if (str.length < length) {
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
    CModeHelper.prototype.calculateFCS = function (data) {
        let CRC = 0;
        const dataLen = data.length;
        for (let ch = 0; ch <= dataLen; ch++) {
            CRC = data.charCodeAt(ch) ^ CRC;
        }
        const FCS = CRC.toString(16).toUpperCase();
        return FCS;
    }

    exports.terminator = terminator;
    exports.delimiter = delimiter;
    exports.COMMANDS = COMMANDS;
    exports.FRAME_MULTILINK = FRAME_MULTILINK;
    // exports.FRAME_SINGLELINK = FRAME_SINGLELINK; //future?
    exports.MODEL_CODES = MODEL_CODES;
    exports.END_CODES = END_CODES;
    exports.CModeHelper = CModeHelper;

}(typeof exports === 'undefined' ? this.C_MODE = {} : exports));
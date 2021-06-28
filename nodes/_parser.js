function kvMaker(fnAddressToString, address, values) {
    let kvs = {};
    if (values) {
        let iWD = 0;
        for (let x in values) {
            let item_addr = fnAddressToString(address, iWD, 0);
            kvs[item_addr] = values[x];
            iWD++;
        }
    }
    return kvs;
}

function kvMakerBits(fnAddressToString, address, values, asBool) {
    let kvs = {};
    if (values) {
        let iWD = 0;
        let iBit = 0;
        for (let x in values) {
            let item_addr = fnAddressToString(address, iWD, iBit);
            kvs[item_addr] = asBool ? !!values[x] : values[x];
            iBit++;
            if (address.Bit + iBit > 15) {
                iBit = -address.Bit;
                iWD++;
            }
        }
    }
    return kvs;
}

module.exports.keyValueMaker = kvMaker;
module.exports.keyValueMakerBits = kvMakerBits;
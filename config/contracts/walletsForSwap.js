let wallet = require('./walletParameters');
let rootParameters = require('./rootContractParameters');

/**
 * Is used to encode text parameters
 * @param {String} str 
 */
function toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
}

function copyJSON(json) {
    return JSON.parse(JSON.stringify(json));
}

let walletsDeployParameters = {
    pairs: [{
        wallet: {
            config: copyJSON(wallet),
            keys: {},
        },
        root: {
            config: copyJSON(rootParameters),
            keys: {},
        },
        walletsAmount: 2,
        tokensAmount: 88880000000,
        callbackAddress: '',
    }, {
        wallet: {
            config: copyJSON(wallet),
            keys: {},
        },
        root: {
            config: copyJSON(rootParameters),
            keys: {},
        },
        walletsAmount: 2,
        tokensAmount: 88880000000,
        callbackAddress: '',
    }]
};

walletsDeployParameters.pairs[0].root.config.initParams.name = toHex('TestCoin1');
walletsDeployParameters.pairs[1].root.config.initParams.name = toHex('TestCoin2');

module.exports = walletsDeployParameters;
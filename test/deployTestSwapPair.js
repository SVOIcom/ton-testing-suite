const fs = require('fs');

const freeton = require('../src');
const { expect } = require('chai');
const logger = require('mocha-logger');
const { CRYSTAL_AMOUNT, DEFAULT_TIMEOUT, ZERO_ADDRESS, RETRIES } = require('../config/general/constants');

const RootContract = require('../contractWrappers/tip3/rootContract');
const Wallet = require('../contractWrappers/tip3/walletContract');
const WalletDeployer = require('../contractWrappers/tip3/walletDeployer');
const RootSwapPairContarct = require('../contractWrappers/swap/rootSwapPairContract');
const SwapPairContract = require('../contractWrappers/swap/swapPairContract');
const TONStorage = require('../contractWrappers/util/tonStorage');

const giverConfig = require('../config/contracts/giverConfig');
const networkConfig = require('../config/general/networkConfig');
const seedPhrase = require('../config/general/seedPhraseConfig');

var pairsConfig = require('../config/contracts/walletsForSwap');
var swapConfig = require('../config/contracts/swapPairContractsConfig');
const { sleep } = require('../src/utils');

const ton = new freeton.TonWrapper({
    giverConfig: giverConfig,
    network: networkConfig.network,
    seed: seedPhrase
});

var rootSwapContract;
var swapPairContract;
var tonStorages = [];
var tip3Tokens = [];
var tip3TokensConfig = [];

var keysRequired = 0;
var transferAmount = [];

var giverSC = new freeton.ContractWrapper(
    ton,
    giverConfig.abi,
    null,
    giverConfig.address,
);
/**
 * Copy JSON
 * @param {JSON} json 
 */
function copyJSON(json) {
    return JSON.parse(JSON.stringify(json));
}

/**
 * Send grams to address
 * @param {freeton.ContractWrapper} giver 
 * @param {String} address 
 * @param {Number} amount 
 */
async function sendGrams(giver, address, amount) {
    await giver.run(
        'sendGrams', {
            dest: address,
            amount: amount
        }, null
    );
}

/**
 * Initial token config creation
 * @param {freeton.TonWrapper} tonInstance 
 * @param {JSON} config 
 */
function initialTokenSetup(tonInstance, config) {
    let tokenConfig = copyJSON(config);
    tokenConfig.walletsConfig = [];

    tokenConfig.root.keys = ton.keys[0];
    tokenConfig.root.config.initParams.root_public_key = '0x' + tonInstance.keys[0].public;

    for (let i = 0; i < config.walletsAmount; i++) {
        let walletConfig = copyJSON(config.wallet);
        walletConfig.keys = ton.keys[i];
        walletConfig.config.initParams.wallet_public_key = '0x' + tonInstance.keys[i].public;
        tokenConfig.walletsConfig.push(walletConfig);
    }

    return tokenConfig;
}

/**
 * Initial swap config
 * @param {freeton.TonWrapper} tonInstance 
 * @param {JSON} config 
 * @param {Array} tokens
 */
function initialSwapSetup(tonInstance, config, tokens) {
    config.root.keyPair = tonInstance.keys[0];
    config.root.initParams.ownerPubkey = '0x' + tonInstance.keys[0].public;

    config.pair.keyPair = tonInstance.keys[0];
    config.pair.initParams.token1 = tokens[0].root.rootContract.address;
    config.pair.initParams.token2 = tokens[1].root.rootContract.address;

    return config;
}

/**
 * Deploy TIP-3 token root contract and wallets
 * @param {freeton.TonWrapper} tonInstance 
 * @param {JSON} tokenConfig 
 * @param {freeton.ContractWrapper} giverSC
 */
async function deployTIP3(tonInstance, tokenConfig, giverSC) {
    let rootSC;
    let proxyContract;
    let wallets = [];

    logger.log('#####################################');
    logger.log('Initial stage');

    for (let contractId = 0; contractId < tokenConfig.walletsAmount; contractId++) {
        let walletConfig = tokenConfig.walletsConfig[contractId];
        wallets.push(new Wallet(tonInstance, walletConfig.config, walletConfig.keys));
        await wallets[contractId].loadContract();
    }

    tokenConfig.root.config.initParams.wallet_code = wallets[0].walletContract.code;
    rootSC = new RootContract(tonInstance, tokenConfig.root.config, tokenConfig.root.keys);
    await rootSC.loadContract();

    logger.log('Deploying root contract');
    await rootSC.deployContract();

    logger.log('Loading and deploying proxy contract');
    proxyContract = new WalletDeployer(tonInstance, {
        initParams: {},
        constructorParams: {}
    }, tokenConfig.root.keys);
    await proxyContract.loadContract();
    await proxyContract.deployContract(rootSC.rootContract.address);

    logger.log('Deploying wallet contracts and sending them tons');
    for (let contractId = 0; contractId < wallets.length; contractId++) {
        let walletConfig = wallets[contractId].initParams;
        await proxyContract.deployWallet(walletConfig.wallet_public_key, walletConfig.owner_address);

        let calculatedAddress = await rootSC.calculateFutureWalletAddress(walletConfig.wallet_public_key, walletConfig.owner_address);
        wallets[contractId].walletContract.address = calculatedAddress;

        await sendGrams(giverSC, calculatedAddress, CRYSTAL_AMOUNT);
    }

    logger.log('Minting tokens to wallets');
    for (let contractId = 0; contractId < wallets.length; contractId++) {
        await rootSC.mintTokensToWallet(wallets[contractId], tokenConfig.tokensAmount);
    }

    return {
        wallets: wallets,
        root: rootSC
    }
}

describe('Test of swap pairs', async function() {
    it('Preinit stage', async function() {
        for (let i = 0; i < pairsConfig.pairs.length; i++)
            if (pairsConfig.pairs[i].walletsAmount > keysRequired)
                keysRequired = pairsConfig.pairs[i].walletsAmount;
    })

    it('Initial stage', async function() {
        logger.log('#####################################');
        logger.log('Setting up ton instance');
        try {
            await ton.setup(keysRequired);
            ton.debug = false;
            for (let tokenId = 0; tokenId < pairsConfig.pairs.length; tokenId++)
                tip3TokensConfig.push(initialTokenSetup(ton, pairsConfig.pairs[tokenId]));
        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Deploying ton handlers', async function() {
        logger.log('#####################################');
        logger.log('Loading contracts');
        this.timeout(DEFAULT_TIMEOUT * 5);
        try {
            for (let index = 0; index < ton.keys.length; index++) {
                tonStorages.push(new TONStorage(ton, {}, ton.keys[index]));
                await tonStorages[index].loadContract();
            }

            logger.log('Deploying contracts');
            for (let index = 0; index < tonStorages.length; index++) {
                await tonStorages[index].deploy();
            }

        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Deploying TIP-3', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 10);
        try {
            for (let tokenId = 0; tokenId < tip3TokensConfig.length; tokenId++) {
                logger.log(`Deploying ${tokenId+1} TIP-3 token`);
                tip3Tokens.push(await deployTIP3(ton, tip3TokensConfig[tokenId], giverSC));
            }
        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Initial config of swap contracts', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT);
        swapConfig = initialSwapSetup(ton, swapConfig, tip3Tokens);
    })

    it('Loading contracts', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 3);
        try {
            logger.log('Loading swap pair contract');
            swapPairContract = new SwapPairContract(ton, swapConfig.pair, swapConfig.pair.keyPair);
            await swapPairContract.loadContract();

            logger.log('Loading root swap pair contract');
            swapConfig.root.constructorParams.spCode = swapPairContract.swapPairContract.code;
            rootSwapContract = new RootSwapPairContarct(ton, swapConfig.root, swapConfig.root.keyPair);
            await rootSwapContract.loadContract();
        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Deploying root contract', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 2);

        try {
            await rootSwapContract.deployContract(true);
            logger.success(`Root swap pair address: ${rootSwapContract.rootSwapPairContract.address}`);
        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Get root swap pair contract information', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 2);

        try {
            let rootSwapPairInfo = await rootSwapContract.getServiceInformation();
            logger.log(`Swap pair info: ${rootSwapPairInfo.rootContract}`);
        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Deploy swap pair contract from root contract', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 3);

        try {
            await rootSwapContract.deploySwapPair(
                swapConfig.pair.initParams.token1,
                swapConfig.pair.initParams.token2
            );

            let output = await rootSwapContract.checkIfPairExists(
                swapConfig.pair.initParams.token1,
                swapConfig.pair.initParams.token2
            );

            logger.success('Pair created');

        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Getting information about deployed pair', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 2);

        try {
            let output = await rootSwapContract.getPairInfo(
                swapConfig.pair.initParams.token1,
                swapConfig.pair.initParams.token2
            );

            if (!output.swapPairAddress) {
                throw new Error(`Strange output of getPairInfo function: ${JSON.stringify(output)}`)
            }

            expect(output.tokenRoot1).equal(swapConfig.pair.initParams.token1, 'Invalid token1 address');
            expect(output.tokenRoot2).equal(swapConfig.pair.initParams.token2, 'Invalid token2 address');
            expect(output.rootContract).equal(rootSwapContract.rootSwapPairContract.address, 'Invalid root address');

            logger.log(`Swap pair address: ${output.swapPairAddress}`);
            swapPairContract.swapPairContract.address = output.swapPairAddress;

            logger.success('Information check passed');

        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Getting information about swap pair from swap pair', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT);

        let counter = 0;
        try {
            let output = await swapPairContract.getPairInfo();
            logger.log(JSON.stringify(output, null, '\t'));
            expect(output.tokenRoot1).equal(swapConfig.pair.initParams.token1);
            expect(output.tokenRoot2).equal(swapConfig.pair.initParams.token2);
            expect(output.rootContract).equal(rootSwapContract.rootSwapPairContract.address);

            while (output.tokenWallet1 == ZERO_ADDRESS || output.tokenWallet2 == ZERO_ADDRESS) {
                counter++;
                output = await swapPairContract.getPairInfo();
                logger.log(`Try #${counter}: ${JSON.stringify(output, null, '\t')}`);
                await sleep(15000);
            }

            swapPairContract.tokenWallets.push(output.tokenWallet1, output.tokenWallet2);

            logger.success('Information check passed');
        } catch (err) {
            console.log(JSON.stringify(err, null, '\t'));
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Transferring tons to swap pair wallet', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);

        try {
            for (let contractIndex = 0; contractIndex < tonStorages.length; contractIndex++) {
                await tonStorages[contractIndex].sendTONTo(
                    swapPairContract.swapPairContract.address,
                    freeton.utils.convertCrystal('1', 'nano')
                );

                let output = 0;
                let counter = 0;
                while (output == 0) {
                    if (counter > RETRIES)
                        throw new Error(
                            `Swap pair did not receive TONs in ${RETRIES} retries. ` +
                            `Contract address: ${tonStorages[contractIndex].tonStorageContract.address}`
                        );
                    counter++;
                    output = await swapPairContract.getUserTONBalance(ton.keys[contractIndex]);
                    output = output.toNumber();
                    await sleep(2000);
                }
            }
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Transferring tokens to swap pair wallet', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);

        try {
            transferAmount = [];
            for (let tokenId = 0; tokenId < tip3TokensConfig.length; tokenId++)
                transferAmount.push(tip3TokensConfig[tokenId].tokensAmount);

            for (let tokenId = 0; tokenId < tip3Tokens.length; tokenId++) {
                logger.log(`Transferring ${transferAmount[tokenId]} tokens to swap pair wallet`);
                for (let walletId = 0; walletId < tip3Tokens[tokenId].wallets.length; walletId++) {
                    logger.log(`transferring tokens from ${walletId+1} wallet`)
                    await tip3Tokens[tokenId].wallets[walletId].transferWithNotify(
                        swapPairContract.tokenWallets[tokenId],
                        transferAmount[tokenId]
                    )
                }
            }

            logger.success('Transfer finished');

        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Checking if all tokens are credited to virtual balance', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT);

        try {
            for (let tokenId = 0; tokenId < tip3Tokens.length; tokenId++) {
                let field = `tokenBalance${tokenId+1}`;
                for (let walletId = 0; walletId < tip3Tokens[tokenId].wallets.length; walletId++) {
                    let wallet = tip3Tokens[tokenId].wallets[walletId];
                    let output = await swapPairContract.getUserBalance(wallet.keyPair);
                    while (output[field] < transferAmount[tokenId]) {
                        logger.log(`output: ${output[field]}`);
                        output = await swapPairContract.getUserBalance(wallet.keyPair);
                        sleep(15000);
                    }
                    expect(Number(output[field])).equal(transferAmount[tokenId], 'Invalid balance');
                }
            }

            logger.success('Tokens credited successfully');
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Logging useful information: ', async function() {
        logger.log('#####################################');

        let info = '{';
        try {
            for (let tokenId = 0; tokenId < tip3Tokens.length; tokenId++) {
                for (let walletId = 0; walletId < tip3Tokens[tokenId].wallets.length; walletId++) {
                    let wallet = tip3Tokens[tokenId].wallets[walletId];
                    info += `wp${walletId}: {\n`;
                    info += `address: ${wallet.walletContract.address}`;
                    info += `keyPair: ${JSON.stringify(wallet.keyPair, null, '\t')}`;
                    info += `},`;
                    logger.log(`Address of wallet: ${wallet.walletContract.address}`);
                    logger.log(`KeyPair: ${JSON.stringify(wallet.keyPair, null, '\t')}`);
                }
            }
            info += '}'
            fs.writeFile('spRes.json', info, () => {});
        } catch (err) {
            console.log(JSON.stringify(err, null, '\t'));
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Yaaaay', async function() {
        logger.success(`Approximate time of execution at TON OS SE - 1 minute`);
    })
})
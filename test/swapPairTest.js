const freeton = require('../src');
const { expect } = require('chai');
const logger = require('mocha-logger');
const { CRYSTAL_AMOUNT, DEFAULT_TIMEOUT, ZERO_ADDRESS, RETRIES } = require('../config/general/constants');

const RootContract = require('../contractWrappers/tip3/rootContract');
const Wallet = require('../contractWrappers/tip3/walletContract');
const Giver = require('../contractWrappers/giverContract');
const WalletDeployer = require('../contractWrappers/tip3/walletDeployer');
const RootSwapPairContarct = require('../contractWrappers/swap/rootSwapPairContract');
const SwapPairContract = require('../contractWrappers/swap/swapPairContract');
const TONStorage = require('../contractWrappers/util/tonStorage');

const giverConfig = require('../config/contracts/giverConfig');
const networkConfig = require('../config/general/networkConfig');
const seedPhrase = require('../config/general/seedPhraseConfig');

var pairsConfig = require('../config/contracts/walletsForSwap');
var swapConfig = require('../config/contracts/swapPairContractsConfig');
const wallet = require('../config/contracts/walletParameters');
const { root } = require('../config/contracts/swapPairContractsConfig');
const { sleep } = require('../src/utils');
const { default: BigNumber } = require('bignumber.js');

const ton = new freeton.TonWrapper({
    giverConfig: giverConfig,
    network: networkConfig.network,
    seed: seedPhrase
});

var rootSwapContract;
var swapPairContract = new SwapPairContract(ton, swapConfig.pair, swapConfig.pair.keyPair);
var tonStorages = [];
var tip3Tokens = [];
var tip3TokensConfig = [];

var keysRequired = 0;
var transferAmount = [];
var totalLPTokens = [];
var walletsCount = 0;

var giverSC = new freeton.ContractWrapper(
    ton,
    giverConfig.abi,
    null,
    giverConfig.address,
);

function toHex(str) {
    return Buffer.from(str, 'utf8').toString('hex');
}

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
        await rootSC.mintTokensToWallet(wallets[contractId], (tokenConfig.tokensAmount).toLocaleString('en').replace(/,/g, ''));
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
            ton.debug = true;
            for (let tokenId = 0; tokenId < pairsConfig.pairs.length; tokenId++)
                tip3TokensConfig.push(initialTokenSetup(ton, pairsConfig.pairs[tokenId]));
        } catch (err) {
            console.log(err);
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
                logger.log(`#${index+1}: ${tonStorages[index].tonStorageContract.address}`);
                logger.log(`${tonStorages[index].keyPair.public}`);
                logger.log(`${JSON.stringify(await tonStorages[index].tonStorageContract.runLocal('getPk', {}, {}))}`);
            }

        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Deploying TIP-3', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);
        try {
            for (let tokenId = 0; tokenId < tip3TokensConfig.length; tokenId++) {
                logger.log(`Deploying ${tokenId+1} TIP-3 token`);
                tip3Tokens.push(await deployTIP3(ton, tip3TokensConfig[tokenId], giverSC));
            }
        } catch (err) {
            console.log(err);
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
        this.timeout(DEFAULT_TIMEOUT * 2);
        try {
            logger.log('Loading swap pair contract');
            // swapPairContract = new SwapPairContract(ton, swapConfig.pair, swapConfig.pair.keyPair);
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
        this.timeout(DEFAULT_TIMEOUT);

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
        this.timeout(DEFAULT_TIMEOUT);

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
        this.timeout(DEFAULT_TIMEOUT);

        try {
            await rootSwapContract.deploySwapPair(
                swapConfig.pair.initParams.token1,
                swapConfig.pair.initParams.token2
            );

            let output = await rootSwapContract.checkIfPairExists(
                swapConfig.pair.initParams.token1,
                swapConfig.pair.initParams.token2
            );

            expect(output).equal(true);

            logger.success('Pair created');

        } catch (err) {
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Getting information about deployed pair', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT);

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

            while (output.tokenWallet1 == ZERO_ADDRESS && output.tokenWallet2 == ZERO_ADDRESS) {
                if (counter > RETRIES) {
                    throw new Error(
                        `Cannot receive wallet address in ${RETRIES} retries`
                    )
                }
                counter++;
                output = await swapPairContract.getPairInfo();
                await sleep(2000);
            }

            swapPairContract.tokenWallets.push(output.tokenWallet1, output.tokenWallet2);

            logger.success('Information check passed');
        } catch (err) {
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
                    console.log(output);
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
                        (transferAmount[tokenId]).toLocaleString('en').replace(/,/g, '')
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
                    expect(Number(output[field]).toLocaleString('en').replace(/,/g, '')).
                    equal((transferAmount[tokenId]).toLocaleString('en').replace(/,/g, ''), 'Invalid balance');
                }
            }

            logger.success('Tokens credited successfully');
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Adding liquidity to pool', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);

        totalLPTokens = [0, 0];
        walletsCount = tip3Tokens[0].wallets.length < tip3Tokens[1].wallets.length ? tip3Tokens[0].wallets.length : tip3Tokens[1].wallets.length;
        logger.log(`Wallets for providing liquidity: ${walletsCount}`);
        try {
            for (let walletId = 0; walletId < walletsCount; walletId++) {
                let wallet = tip3Tokens[0].wallets[walletId];
                let output = await swapPairContract.getUserBalance(wallet.keyPair);
                logger.log(`Wallet ${walletId+1} providing: ${output.tokenBalance1}, ${output.tokenBalance2}`);
                await swapPairContract.provideLiquidity(
                    Number(output.tokenBalance1).toLocaleString('en').replace(/,/g, ''),
                    Number(output.tokenBalance2).toLocaleString('en').replace(/,/g, ''),
                    wallet.keyPair
                );
                totalLPTokens[0] += Number(output.tokenBalance1);
                totalLPTokens[1] += Number(output.tokenBalance2);
            }
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Check tokens amount in liquidity pool', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT);

        try {
            let output = await swapPairContract.getLPTokens();
            logger.log(`Tokens in LPs: ${Number(output.userLiquidityTokenBalance)}, ${Number(output.liquidityTokensMinted)}`);
            expect(Number(output.lpToken1).toLocaleString('en').replace(/,/g, '')).
            equal((totalLPTokens[0]).toLocaleString('en').replace(/,/g, ''));
            expect(Number(output.lpToken2).toLocaleString('en').replace(/,/g, '')).
            equal((totalLPTokens[1]).toLocaleString('en').replace(/,/g, ''));
            logger.success('LP tokens amount is equal to tokens added to pool');
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Swap tokens', async function() {
        logger.log('#####################################');
        //TODO: token swap checks
        this.timeout(DEFAULT_TIMEOUT);
        let d = await swapPairContract._simulateSwap();
        logger.log(d);
        logger.log('Checking k is contstant');
        expext(d.oldK).equal(d.newK);

        logger.log('Checking pools');
        expect(d.newFromPool).equal(d.oldFromPool - d.swappableTokenAmount + d.fee);
        expect(d.newToPool).equal(d.oldToPool + d.targetTokenAmount);

        logger.lof('Checking user balances');
        expect(d.newUserFromBalance).equal(d.oldUserFromBalance - d.swappableTokenAmount);
        expect(d.newUserToBalance).equal(d.oldUserToBalance + d.targetTokenAmount);
    });

    it('Withdraw liquidity', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);

        try {
            for (let walletId = 0; walletId < walletsCount; walletId++) {
                logger.log(`Wallet #${walletId+1}`)
                let wallet = tip3Tokens[0].wallets[walletId];
                let userVBalance = await swapPairContract.getUserBalance(wallet.keyPair);
                logger.log(`User balance befor withdraw: ${userVBalance.tokenBalance1}, ${userVBalance.tokenBalance2}`);
                let output = await swapPairContract.getUserLPBalance(wallet.keyPair);
                console.log(JSON.stringify(output, null, '\t'));

                let tokensWithdrawed = (await swapPairContract.withdrawLiquidity(
                    Number(output.userLiquidityTokenBalance).toLocaleString('en').replace(/,/g, ''),
                    wallet.keyPair
                )).decoded.output;
                logger.log(JSON.stringify(tokensWithdrawed, null, '\t'));

                logger.log(`Withdrawed: ${tokensWithdrawed.withdrawedFirstTokenAmount}, ${tokensWithdrawed.withdrawedSecondTokenAmount}`);
                userVBalance = await swapPairContract.getUserBalance(wallet.keyPair);
                logger.log(`User balance after withdraw: ${userVBalance.tokenBalance1}, ${userVBalance.tokenBalance2}`);
                expect(userVBalance.tokenBalance1.toNumber().toLocaleString('en').replace(/,/g, '')).
                equal(expectedBalance.t1.toLocaleString('en').replace(/,/g, ''));
                expect(userVBalance.tokenBalance2.toNumber().toLocaleString('en').replace(/,/g, '')).
                equal(expectedBalance.t2.toLocaleString('en').replace(/,/g, ''));
            }

            let output = await swapPairContract.getLPTokens();
            logger.log(JSON.stringify(output, null, '\t'));
            expect(output.token1LPAmount.toNumber()).equal(0);
            expect(output.token2LPAmount.toNumber()).equal(0);

            logger.success('Liquidity removed from liquidity pair');
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Withdraw tokens from pair', async function() {
        logger.log('#####################################');
        this.timeout(DEFAULT_TIMEOUT * 5);
        try {
            let spi = await swapPairContract.getPairInfo();
            let counter = 0;
            for (let tokenId = 0; tokenId < tip3Tokens.length; tokenId++) {
                let rootTokenField = `tokenRoot${tokenId+1}`;
                let balanceField = `tokenBalance${tokenId+1}`;
                for (let walletId = 0; walletId < tip3Tokens[tokenId].wallets.length; walletId++) {
                    logger.log(`Transferring tokens to #${walletId+1} wallet of ${tokenId+1} token`);
                    let wallet = tip3Tokens[tokenId].wallets[walletId];
                    let output = await swapPairContract.getUserBalance(wallet.keyPair);
                    logger.log(`Output of call: ${JSON.stringify(output)}`);
                    if (output[balanceField] > 0) {
                        let walletBalance = (await wallet.getDetails()).balance.toNumber();
                        let resultBalance = walletBalance + output[balanceField].toNumber();
                        output = await swapPairContract.withdrawTokens(
                            spi[rootTokenField],
                            wallet.walletContract.address,
                            output[balanceField].toLocaleString('en').replace(/,/g, ''),
                            wallet.keyPair
                        );
                        walletBalance = 0;
                        counter = 0;
                        while (walletBalance == 0) {
                            if (counter > 10) {
                                throw new Error(
                                    `Target wallet did not receive tokens. Wallet address: ${wallet.walletContract.address}, ` +
                                    `token root: ${spi[rootTokenField]}, ` +
                                    `swap pair wallet: ${spi['tokenWallet'+(tokenId+1)]}`
                                );
                            }
                            counter++;
                            output = await wallet.getDetails();
                            logger.log(`balance: ${output.balance }`);
                            walletBalance = output.balance.toNumber();
                            await sleep(5000);
                        }
                        expect(walletBalance).equal(resultBalance);
                    }
                }
            }
        } catch (err) {
            console.log(err);
            logger.error(JSON.stringify(err, null, '\t'));
            process.exit(1);
        }
    })

    it('Yaaaay', async function() {
        logger.success(`Approximate time of execution at TON OS SE - 2+ minutes`);
    })
})
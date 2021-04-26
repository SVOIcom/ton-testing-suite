const freeton = require('../src');
const { expect } = require('chai');
const logger = require('mocha-logger');
const { USERS_OF_TONSWAP, DEFAULT_TIMEOUT } = require('../config/general/constants');

const RootContract = require('../contractWrappers/tip3/rootContract');
const RootSwapPairContract = require('../contractWrappers/swap/rootSwapPairContract');
const SwapPairContract = require('../contractWrappers/swap/swapPairContract');
const TIP3Deployer = require('../contractWrappers/util/tip3Deployer');
const User = require('./actors/user');

const giverConfig = require('../config/contracts/giverConfig');
const networkConfig = require('../config/general/networkConfig');
const seedPhrase = require('../config/general/seedPhraseConfig');

const testScenario = require('../config/general/testScenario');
var swapConfig = require('../config/contracts/swapPairContractsConfig');
const { deployTIP3Root, initialTokenSetup, createRootSwapPairConfig, awaitForContractDeployment, getTIP3Codes } = require('./util');
const rootTIP3Params = require('../config/contracts/rootTIP3Config');

const ton = new freeton.TonWrapper({
    giverConfig: giverConfig,
    network: networkConfig.network,
    seed: seedPhrase
});

/**
 * @name users
 * @type {User[]}
 */
users = [];

/**
 * @name tip3RootContracts
 * @type {RootContract[]}
 */
tip3RootContracts = [];

/**
 * @name rootSwapPairContract
 * @type {RootSwapPairContract}
 */
rootSwapPairContract = undefined;

/**
 * @name swapPairContract
 * @type {SwapPairContract}
 */
swapPairContract = undefined;

/**
 * @name tip3Deployer
 * @type {TIP3Deployer}
 */
tip3Deployer = undefined;

try {
    describe('Test of swap pairs', async function() {
        it('Preinit stage', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            await ton.setup(USERS_OF_TONSWAP);
            ton.debug = true;
            for (let i = 0; i < USERS_OF_TONSWAP; i++) {
                users.push(new User(ton.keys[i], ton));
            }
        })

        it('Creating multisig wallets', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша: создание мультисиг кошельков
            /**
             * @name user
             * @type {User}
             */
            let user;
            for (user of users) {
                await user.createMultisigWallet();
            }
        })

        it('Deploying TIP3 root contracts', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша: деплой тип-3 рут контрактов
            for (let tip3Index = 0; tip3Index < 2; tip3Index++)
                tip3RootContracts.push(await deployTIP3Root(ton, await initialTokenSetup(ton, rootTIP3Params[tip3Index])));
        })

        it('Deploying TIP3 wallets', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша: деплой тип-3 кошельков 
            /**
             * @name user
             * @type User
             */
            let user;
            for (let tip3Index = 0; tip3Index < 2; tip3Index++)
                for (user of users)
                    await user.createWallet(tip3RootContracts[tip3Index], testScenario[tip3Index]);
        })

        it('Deploying tip3 deployer for contracts', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            tip3Deployer = new TIP3Deployer(ton, ton.keys[0]);
            let tip3Codes = await getTIP3Codes(ton);
            await tip3Deployer.deployContract(tip3Codes.root, tip3Codes.wallet);
        })

        it('Deploying Swap Pair Root Contract', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша: деплой рут контракта свап пары

            /**
             * @name rootSwapPairConfig
             * @type {JSON}
             */
            rootSwapPairConfig = await createRootSwapPairConfig(swapConfig, tip3Deployer.getAddress(), ton);
            rootSwapPairContract = new RootSwapPairContract(ton, rootSwapPairConfig, ton.keys[0]);
            await rootSwapPairContract.loadContract();
            await rootSwapPairContract.deployContract(true);
        })

        it('Deploying Swap Pair', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша: деплой свап пары для созданных тип3 токенов
            await rootSwapPairContract.deploySwapPair(tip3RootContracts[0].getAddress(), tip3RootContracts[1].getAddress());
            swapPairContract = new SwapPairContract(ton, ton.keys[0]);
            await swapPairContract.loadContract();
            swapPairContract.setContractAddress(
                await rootSwapPairContract.getFutureSwapPairAddress(tip3RootContracts[0].getAddress(), tip3RootContracts[1].getAddress())
            );
            await awaitForContractDeployment(swapPairContract.getAddress(), ton);
            swapPairContract.info = await rootSwapPairContract.awaitSwapPairInitialization(tip3RootContracts[0].getAddress(), tip3RootContracts[1].getAddress(), swapPairContract);

        })

        it('Providing liquidity for swap pair', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша, Антон: предоставление ликвидности свап паре

            let token1Amount = testScenario[0] / 4;
            let token2Amount = testScenario[1] / 4;
            let expectedLPTokenAmount = token1Amount * token2Amount;
            /**
             * @name user
             * @type {User}
             */
            let user;

            /**
             * @name userStateChange
             * @type {JSON[]}
             */
            let userStateChange = [];
            for (user of users)
                userStateChange.push(await user.provideLiquidity(swapPairContract, token1Amount, token2Amount));

            /**
             * @name state
             * @type {JSON}
             */
            let state;
            for (let state of userStateChange) {
                let token1State = token1Amount == (state.start[tip3RootContracts[0].getAddress()].balance - state.finish[tip3RootContracts[0].getAddress()].balance);
                let token2State = token2Amount == (state.start[tip3RootContracts[1].getAddress()].balance - state.finish[tip3RootContracts[1].getAddress()].balance);
                let lpTokenState = expectedLPTokenAmount == (state.finish[swapPairContract.info.lpTokenRoot].balance - state.start[swapPairContract.info.lpTokenRoot].balance);
                let resState = token1State && token2State && lpTokenState;
            }
        })

        it('Providing liquidity using one token', async function() {
            // TODO: Паша, Антон: предоставление ликвидности свап паре с помощью одного токена
        })

        it('Token swap', async function() {
            this.timeout(DEFAULT_TIMEOUT);
            // TODO: Паша, Антон: обмен одних токенов на другие токены
            let tokenAmount = testScenario[0] / 100;

            /**
             * @name userStateChange
             * @type {JSON[]}
             */
            let userStateChange = [];

            /**
             * @name user
             * @type {User}
             */
            let user;
            for (user of users) {
                userStateChange.push(await user.swapTokens(swapPairContract, tokenAmount));
            }

            /**
             * @name state
             * @type {JSON}
             */
            let state;
            for (state of userStateChange) {
                let token1State = tokenAmount == (state.start[tip3RootContracts[0].getAddress()] - state.finish[tip3RootContracts[0].getAddress()]);
                let token2State = (state.start[tip3RootContracts[1].getAddress()] < state.finish[tip3RootContracts[1].getAddress()]);
                let resState = token1State && token2State;
            }
        })

        it('Withdrawing liquidity', async function() {
            // TODO: Паша, Антон: вывод ликвидности из пары
            this.timeout(DEFAULT_TIMEOUT);
            /**
             * @name user
             * @type {User}
             */
            let user;

            /**
             * @name userStateChange
             * @type {JSON[]}
             */
            let userStateChange = [];

            for (user of users) {
                let lpTokenAmount = await user.checkWalletBalance(swapPairContract.info.lpTokenRoot);
                userStateChange.push(await user.withdrawTokens(swapPairContract, lpTokenAmount / 2));
            }
            /**
             * @name state
             * @type {JSON}
             */
            let state;
            for (state of userStateChange) {
                let token1State = (state.finish[tip3RootContracts[0].getAddress()] > state.start[tip3RootContracts[0].getAddress()]);
                let token2State = (state.finish[tip3RootContracts[1].getAddress()] > state.start[tip3RootContracts[1].getAddress()]);
                let resState = token1State && token2State;
            }
        })

        it('Withdrawing liquidity by using one token', async function() {
            // TODO: Паша, Антон: вывод ликвидности из пары с помощью одного токена
        })
    })
} catch (error) {
    console.log(JSON.stringify(error));
}
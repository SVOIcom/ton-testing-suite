const freeton = require('../src');
const { expect } = require('chai');
const logger = require('mocha-logger');

const testScenario = require('./config/testScenario');

const giverConfig = require('./config/giverConfig');
const networkConfig = require('./config/networkConfig');
const seedPhrase = require('./config/seedPhraseConfig');

let rootContractParameters = require('./config/rootContractParameters');
const walletParameters = require('./config/walletParameters');

const RootContract = require('./rootContract');
const Wallet = require('./walletContract');
const Giver = require('./giverContract');
const CallbackContract = require('./callbackContract');

function clone(a) {
    return JSON.parse(JSON.stringify(a));
}

const ton = new freeton.TonWrapper({
    giverConfig: giverConfig,
    network: networkConfig.network,
    seed: seedPhrase
});

let rootSC;
let wallet1;
let wallet2;
let callbackSC;
let giverSC;


describe('Test for TIP-3 token', async function() {
    describe('Root token contract', async function() {
        it('Setup', async function() {
            await ton.setup(4);

            expect(ton.keys).to.have.lengthOf(4, 'Wrong keys amount');
        });

        it('Initial stage', async function() {
            wallet1Config = clone(walletParameters); // user wallet
            wallet2Config = clone(walletParameters); // swap pair wallet
            wallet1Config.initParams.wallet_public_key = '0x' + ton.keys[1].public;
            wallet2Config.initParams.wallet_public_key = '0x' + ton.keys[2].public;

            wallet1 = new Wallet(ton, wallet1Config, ton.keys[1]);
            wallet2 = new Wallet(ton, wallet2Config, ton.keys[2]);

            rootSC = new RootContract(ton, rootContractParameters, ton.keys[0]);

            giverCS = new Giver(ton, giverConfig.keyPair);
            callbackSC = new CallbackContract(ton, CallbackContract, ton.keys[0]);
        });

        it('Load wallet contracts', async function() {
            await wallet1.loadContract();
            await wallet2.loadContract();
        })

        it('Load root contract', async function() {
            rootContractParameters.initParams.root_public_key_ = '0x' + ton.keys[0].public;
            rootContractParameters.initParams.wallet_code_ = wallet1.walletContract.imageBase64;
            rootSC.setConfig(rootContractParameters);
            await rootSC.loadContract();
        });

        it('Load callback contract', async function() {
            this.timeout(0);
            await callbackSC.loadContract();
        });

        it('Callback contract deploy', async function() {
            this.timeout(0);
            await callbackSC.deployContract();
        });

        it('Deploy of root contract', async function() {
            this.timeout(0);
            await rootSC.deployContract();
        });

        it('Root contract basic checks', async function() {
            this.timeout(0);
            await rootSC.checkParameters();
        });

        it('Wallet contracts deploy', async function() {
            this.timeout(0);
            let walletAddresses = await rootSC.deployWallets(wallet1, wallet2);
            wallet1.address = walletAddresses.user;
            wallet2.address = walletAddresses.swap;
        });

        it('Ton crystal distribution', async function() {
            this.timeout(0);
            const giverContract = new freeton.ContractWrapper(
                this.tonWrapper,
                this.tonWrapper.giverConfig.abi,
                null,
                this.tonWrapper.giverConfig.address,
            );

            await giverSC.sendGrams(wallet1.address, freeton.utils.convertCrystal('10', 'nano'));
            await giverSC.sendGrams(wallet2.address, freeton.utils.convertCrystal('10', 'nano'));
            await giverSC.sendGrams(rootSC.address, freeton.utils.convertCrystal('10', 'nano'));
            await giverSC.sendGrams(callbackSC.address, freeton.utils.convertCrystal('10', 'nano'));
        });

        it('Minting tokens to contracts', async function() {
            this.timeout(0);
            await rootSC.mintTokensToWallets(wallet1, wallet2, testScenario.pair1.tokensAmount);
        });

        it('Transactions with callback test', async function() {
            this.timeout(0);
            wallet1.setTransactionAddress(wallet2.address);
            wallet2.setTransactionAddress(wallet1.address);
            await wallet1.transfer(10, callbackSC.address);
            let result = await callbackSC.getResult();
            let expectedResult = {
                sender: wallet1.address,
                receiver: wallet2.address,
                amount: 10,
                timestamp: result.timestamp
            };
            expect(result).to.deep.equal(expectedResult, `Error of transfer. Expected: ${expectedResult}, got: ${result}`);
            await wallet2.transfer(10, callbackSC.address);
            result = await callbackSC.getResult();
            expectedResult = {
                sender: wallet2.address,
                receiver: wallet1.address,
                amount: 10,
                timestamp: result.timestamp
            };
            expect(result).to.deep.equal(expectedResult, `Error of transfer. Expected: ${expectedResult}, got: ${result}`);
        });
    });
});
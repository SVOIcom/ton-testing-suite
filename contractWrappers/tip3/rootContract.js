const freeton = require('../../src');
const { expect } = require('chai');
const logger = require('mocha-logger');
const Wallet = require('./walletContract');
const { sleep } = require('../../src/utils');

class RootContract {
    /**
     * 
     * @param {freeton.TonWrapper} tonInstance 
     * @param {JSON} rootParameters 
     * @param {JSON} keyPair 
     */
    constructor(tonInstance, rootParameters, keyPair) {
        this.tonInstance = tonInstance;
        this.keyPair = keyPair;
        this.initParams = rootParameters.initParams;
        this.constructorParams = rootParameters.constructorParams;
        this.rootContract = undefined;
    }

    setConfig(newConfig) {
        this.initParams = newConfig.initParams;
        this.constructorParams = newConfig.constructorParams;
    }

    /**
     * Deploy root contract or just get the address
     * @dev For internal use only
     * @param {Boolean} onlyAddress 
     * @returns {Promise<String>}
     */
    async _deployRoot(onlyAddress) {
        if (onlyAddress)
            return await this.rootContract.getFutureAddress({
                constructorParams: this.constructorParams,
                initParams: this.initParams,
                keyPair: this.keyPair
            })
        else
            return await this.rootContract.deploy({
                constructorParams: this.constructorParams,
                initParams: this.initParams,
                initialBalance: freeton.utils.convertCrystal('15', 'nano'),
                _randomNonce: true,
                keyPair: this.keyPair
            });
    }

    /**
     * Deploy wallet contract from root contract
     * @dev For internal use only
     * @param {Wallet} walletObject 
     * @returns {Promise<String>}
     */
    async _deployWallet(walletObject) {
        return (await this.rootContract.run(
            'deployWallet',
            walletObject.initParams,
            this.keyPair
        )).decoded.output.value0;
    }

    /**
     * Mint tokens to specified wallet
     * @dev Fails with Error if balance test fails
     * @dev For internal use only
     * @param {Wallet} walletObject
     * @param {Number} tokensAmount
     */
    async _mintToWallet(walletObject, tokensAmount) {
        await this.rootContract.run(
            'mint', {
                tokens: tokensAmount,
                to: walletObject.walletContract.address
            },
            this.keyPair
        );
    }

    /**
     * Load root contract from local file system
     */
    async loadContract() {
        this.rootContract = await freeton.requireContract(this.tonInstance, 'RootTokenContract');

        expect(this.rootContract.address).to.equal(undefined, 'Address should be undefined');
        expect(this.rootContract.code).not.to.equal(undefined, 'Code should be available');
        expect(this.rootContract.abi).not.to.equal(undefined, 'ABI should be available');
    }

    /**
     * Get future address of root contract
     */
    async getFutureAddress() {
        let address = await this._deployRoot(true);

        expect(this.rootContract.address).to.be.a('string').and.satisfy(s => s.startsWith('0:'), 'Bad address');
        return address;
    }

    /**
     * Deploy root contract
     */
    async deployContract() {
        await this._deployRoot(false);
        expect(this.rootContract.address).to.be.a('string').and.satisfy(s => s.startsWith('0:'), 'Bad address');

        logger.success(`Contract address: ${this.rootContract.address}`);
    }

    async getDetails() {
        return this.rootContract.runLocal('getDetails', {});
    }

    /**
     * Mint tokens to specified addresses
     * @param {Wallet} userWallet Wallet of user 
     * @param {Wallet} swapPairWallet Wallet of swap pair
     * @param {JSON} initialTokens Initial tokens distribution
     */
    async mintTokensToWallets(userWallet, swapPairWallet, initialTokens) {
        let userBalance = await this._mintToWallet(userWallet, initialTokens.user);
        let swapBalance = await this._mintToWallet(swapPairWallet, initialTokens.swap);
    }

    /**
     * Mint tokens to specified address
     * @param {Wallet} wallet Wallet to mint tokens to
     * @param {JSON} tokensAmount Tokens amount
     */
    async mintTokensToWallet(wallet, tokensAmount) {
        let balance = await this._mintToWallet(wallet, tokensAmount);
    }

    /**
     * Calculate address of smart contract wallet
     * @param {String} pubkey 
     * @param {String} address 
     */
    async calculateFutureWalletAddress(pubkey, address) {
        return (await this.rootContract.runLocal('getWalletAddress', {
            wallet_public_key_: pubkey,
            owner_address_: address
        }));
    }
}

module.exports = RootContract;
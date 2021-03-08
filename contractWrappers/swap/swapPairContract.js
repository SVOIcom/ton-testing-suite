const freeton = require('../../src');

class SwapPairContract {
    /**
     * 
     * @param {freeton.TonWrapper} tonInstance 
     * @param {JSON} config
     * @param {JSON} keyPair 
     */
    constructor(tonInstance, config, keyPair) {
        this.tonInstance = tonInstance;
        this.keyPair = keyPair;
        this.initParams = config.initParams;
        this.constructorParams = config.constructorParams;
        this.swapPairContract = undefined;

        this.tokenWallets = [];
    }

    /**
     * Loads contract files from file system
     */
    async loadContract() {
        this.swapPairContract = await freeton.requireContract(this.tonInstance, 'SwapPairContract');
    }

    //========================Getters========================//

    /**
     * Get creation timestamp of pair
     */
    async getCreationTimestamp() {
        return await this.swapPairContract.runLocal(
            'getCreationTimestamp', {}, {}
        )
    }

    /**
     * Get pair service information 
     */
    async getPairInfo() {
        return await this.swapPairContract.runLocal(
            'getPairInfo', {}, {}
        )
    }

    /**
     * get user token balance
     * @param {JSON} userKeys 
     */
    async getUserBalance(userKeys) {
        return await this.swapPairContract.runLocal(
            'getUserBalance', {
                pubkey: '0x' + userKeys.public,
            }, userKeys
        )
    }

    async getUserLPBalance(userKeys) {
        return await this.swapPairContract.runLocal(
            'getUserLiquidityPoolBalance', {
                pubkey: '0x' + userKeys.public
            }, userKeys
        )
    }

    /**
     * get exchange rate if amount is exchanged
     * @param {String} rootToken address of token root
     * @param {Number} amount amount of tokens to swap
     * @param {JSON} keyPair user's keypair
     */
    async getExchangeRate(rootToken, amount, keyPair) {
        return await this.swapPairContract.runLocal(
            'getExchangeRate', {
                swappableTokenRoot: rootToken,
                swappableTokenAmount: amount
            },
            keyPair
        );
    }

    //========================Actual Functions========================//

    /**
     * swap amount of tokens
     * @param {String} rootToken address of token root
     * @param {Number} amount amount of tokens to swap
     * @param {JSON} keyPair user's keypair
     */
    async swap(rootToken, amount, keyPair) {
        return await this.swapPairContract.run(
            'swap', {
                swappableTokenRoot: rootToken,
                swappableTokenAmount: amount
            },
            keyPair
        )
    }

    /**
     * Add tokens to liquidity pool from user's virtual balance
     * @param {Number} amount1 token1 amount to add to liquidity pool
     * @param {Number} amount2 token2 amount to add to liquidity pool
     * @param {JSON} keyPair user's keypair
     */
    async provideLiquidity(amount1, amount2, keyPair) {
        return await this.swapPairContract.run(
            'provideLiquidity', {
                maxFirstTokenAmount: amount1,
                maxSecondTokenAmount: amount2
            },
            keyPair
        )
    }

    /**
     * withdraw tokens from pair
     * @param {Number} amountT1 amount of first token to withdraw 
     * @param {Number} amountT2 amount of second token to withdraw
     * @param {JSON} keyPair user's keypair
     */
    async withdrawLiquidity(amountT1, amountT2, keyPair) {
        return await this.swapPairContract.run(
            'withdrawLiquidity', {
                minFirstTokenAmount: amountT1,
                minSecondTokenAmount: amountT2
            },
            keyPair
        )
    }

    /**
     * Withdraw tokens from swap pair contract
     * @param {String} rootAddress 
     * @param {String} walletReceiver 
     * @param {Number} amount 
     * @param {JSON} keyPair 
     * @returns 
     */
    async withdrawTokens(rootAddress, walletReceiver, amount, keyPair) {
        return await this.swapPairContract.run(
            'withdrawTokens', {
                withdrawalTokenRoot: rootAddress,
                receiveTokenWallet: walletReceiver,
                amount: amount
            },
            keyPair
        )
    }


    //========================Debug========================//

    /**
     * Get liquidity pool tokens
     */
    async getLPTokens() {
        return await this.swapPairContract.runLocal(
            '_getLiquidityPoolTokens', {}, {}
        )
    }

    /**
     * Get exchange rate
     */
    async getER(token1Amount, token2Amount, token1Swap, token2Swap) {
        return await this.swapPairContract.runLocal(
            '_getExchangeRateSimulation', {
                token1: token1Amount,
                token2: token2Amount,
                swapToken1: token1Swap,
                swapToken2: token2Swap
            }, {}
        )
    }
}

module.exports = SwapPairContract;
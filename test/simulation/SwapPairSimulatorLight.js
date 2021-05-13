const d = 1000n;
const n = 997n;


class SwapPairSimulatorLight {
    constructor() {
        /**
         * @type {Record<String, BigInt>}
         */
        this._pools = {
            true: 0n, // 1
            false: 0n // 2
        }

        this._minted = 0n;
    }


    /**
     * @property
     * @returns {{lp1: BigInt, lp2: BigInt, minted: BigInt}}
     */
    get poolsInfo() {
        return {
            lp1: this._pools.true,
            lp2: this._pools.false,
            minted: this._minted
        }
    }


    /**
     * @param {BigInt} amount1 
     * @param {BigInt} amount2 
     */
    setPools(amount1, amount2) {
        if (amount1 < 0n || amount2 < 0n)
            throw Error('SwapParSimulatorLight: pools cannot be negative');
        this._pools.true = amount1;
        this._pools.false =  amount2;
    }


    /**
     * @param {Boolean} lpFromKey   true - 1, false - 2
     * @param {BigInt} amount 
     * 
     * @returns {BigInt} amount after swap
     */
    swap(lpFromKey, amount) {
        const a = amount;
        /**@type {BigInt} */
        const f = this._pools[lpFromKey];
        /**@type {BigInt} */
        const t = this._pools[!lpFromKey];

        const fn = f+a;
        const x =  f * t;
        const y = fn - a * BigInt(Math.ceil(Number(d-n) / Number(d)));

        let tn = x / y;
        if (tn * y < x)  
            tn++;    // ceiling

        this._pools[lpFromKey] = fn;
        this._pools[!lpFromKey] = tn;

        return t - tn;
    }


    /**
     * @param {BigInt} amount1 
     * @param {BigInt} amount2 
     * 
     * @returns {{p1: BigInt, p2: BigInt, minted: BigInt}} 
     */
    provide(amount1, amount2) {
        let provided1 = 0n,
            provided2 = 0n,
            minted = 0n;

        const p1 = this._pools.true;
        const p2 = this._pools.false
        const m = this._minted;


        if (!this.isLiquidityProvided) {
            provided1 = amount1;
            provided2 = amount2;
            minted = provided1 * provided2;
        } else {
            let maxToProvide1 = amount2 > 0n ? amount2 * p1 / p2 : 0n;
            let maxToProvide2 = amount1 > 0n ? amount1 * p2 / p1 : 0n;

            if (maxToProvide1 <= amount1) {
                provided1 = maxToProvide1;
                provided2 = amount2;
                minted = provided2 * m / p2;
            } else {
                provided1 = amount1;
                provided2 = maxToProvide2;
                minted = provided1 * m / p1;
            }
        }

        this._pools[true] += provided1;
        this._pools[false] += provided2;
        this._minted += minted;

        return { p1: provided1, p2: provided2, minted: minted }
    }


    /**
     * @param {BigInt} lpTokensAmount 
     * @returns {{w1: BigInt, w2: BigInt, burned: BigInt}} burned
     */
    withdraw(lpTokensAmount) {
        let w1 = 0n,
            w2 = 0n,
            burned = 0n;
        const m = this._minted;
        const a = lpTokensAmount;
        const p1 = this._pools.true;
        const p2 = this._pools.false;

        if (m > 0n && a > 0n) {
            w1 = p1 * a / m;
            w2 = p2 * a / m;
            burned = a;
        }

        this._pools.true -= w1;
        this._pools.false -= w2;
        this._minted -= burned;

        return { w1: w1, w2: w2, burned: burned };
    }


    /**
     * @param {Boolean} lpFromKey 
     * @param {BigInt} amount 
     * 
     * @returns {{p1: BigInt, p2: BigInt, minted: BigInt, inputRemainder: BigInt}} 
     */
    provideOneToken(lpFromKey, amount) {
        const needToSwap = this._calculateNeedToSwap(lpFromKey, amount);
        const afterSwap = this.swap(needToSwap);
        const p1 = lpFromKey ? amount - needToSwap : afterSwap;
        const p2 = lpFromKey ? afterSwap : amount - needToSwap;
        let res = this.provide(p1, p2);
        res.inputRemainder = lpFromKey ? (p1 - res.p1) : (p2 - res.p2);
        return res;
    }

    /**
     * 
     * @param {Boolean} wannaGetKey 
     * @param {BigInt} lpTokensAmount 
     * 
     * @returns {BigInt} withdrawed amount
     */
    withdrawOneToken(wannaGetKey, lpTokensAmount) {
        const w = this.withdraw(lpTokensAmount);
        const afterSwap = this.swap(!wannaGetKey, wannaGetKey ? w.w2 : w.w1);

        return afterSwap + (wannaGetKey ? w.w1 : w.w2);
    }


    /**
     * @param {Boolean} lpFromKey 
     * @param {BigInt} providingAmount
     * 
     * @returns {BigInt}
     */
    _calculateNeedToSwap(lpFromKey, providingAmount) {
        const f = this._pools[lpFromKey];
        const p = providingAmount;

        const b = f*(n+d);
        const x = (n+d)*(n+d) + 4n*d*p*n/f;
        const y = this._sqrt(x);                    // TODO: можно попробовать всегда приводить к числу между 1е13 и 1е12. Это должно обеспечить нормальную точность и скорость сходимости
        const v = y * f;

        // console.log('---->', x, y);

        return (v - b) / (n + n);
    }


    /**
     * @param {BigInt} x 
     * @returns {BigInt}
     */
    _sqrt(x) {
        let counter = 1;
        let z = (x + 1n) / 2n;
        let res = x;
        while (z < res) {
            counter++;
            res = z;
            z = (x/z + z) / 2n
        }
        // console.log('sqrt counter = ', counter);
        return res;
    }


    get isLiquidityProvided() {
        return this._pools.true > 0n && this._pools.false > 0n;
    }

}


if (require.main === module){
    console.log('kek');
}



module.exports = SwapPairSimulatorLight;
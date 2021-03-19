Here are test profiles and addresses of deployed smart contracts (to devnet):

# Intro
**Please do not use these profiles just for fun or to ruin swap pair economic on purpose.**

# Test profiles

Key pairs for profiles:
```
Profile 1:
{
        "public": "1d0bafcaa5a39a39f7567bcd5ddaa556eaa12a4eecc87ea142bd0a991e9cf749",
        "secret": "e682829f060325cdb06dedb59636f62f11234c0cbe53511580a388b38b4970bd"
}
Profile 2:
{
        "public": "c29089f9d734ee23fafc8938f8c2f0ced7b47e6ea625511ce837cdba2a3289c8",
        "secret": "60db8ac5bb9fb0e3d0f1e127c32e5af022596906c10af6d3c8e2031bb58a1cdc"
}
Profile 3:
{
        "public": "3f09f7920cd10609d02e4633bb5baf9f2423ecf0ae28c09f3abbbdb1a74fcdd8",
        "secret": "6b3d88240cc8c5213a51d53cf0f65c79e8e9a168ab562c144b27c4a835c24976"
}
Profile 4:
{
        "public": "4588de7cdbde52d90b40ac32614e122300c5d001c38571bba9dd1ad585088933",
        "secret": "2ff50cb926c4f295e765a7bcb1ea466714d14ce1772d77c95abd03253c9ab773"
}
Profile 5:
{
        "public": "6e3686ffa46703416f04c924f1d5fe2248c63cd6fc4b0249c3c21b93077f41d7",
        "secret": "fbfd5a99855a366fe36ef349fb2042eef0cf315a9d578ed59606898289a7e14f"
}
```

# Deployed smart contracts
Root swap pair contract: 
0:df6eaef1911a63490b56fa087c6bec4e39daf3986359da52aa2af83a6e22959b

Swap pair contracts use following tokens for swap:
1. First pair  -> 1 <-> 2
2. Second pair -> 2 <-> 3
3. Third pair  -> 3 <-> 1
 
Swap pair contracts:
1. 0:1627da67bba1aa3551bd68067eef7615c40378b2ef5496eb71c9056abbc0fab5
2. 0:8a21c4452cdf77678ccb524da8718381b12e3682b1e4dce91dcaee682cad4d1c
3. 0:ec9f9d6fb7482a7817046221d18ddc55f3bc4af30643f93114069df686d9a13f

Swap pair wallets for tokens:
1. First pair:
    1. Wallet for 1 token: 0:7abc2f8d325322670188b74b7c32e1ea1591a0febfc09ee4eb9859c21cd2e8bb
    2. Wallet for 2 token: 0:27c526c2369a8b7753ff551207d697212b48e43a4a0bffc95ce5060ac417a31f
2. Second pair:
    1. Wallet for 2 token: 0:cfb653783331a6db3412cf2c027d5f2f0e510c5ae06f15a7505f624a191c4926
    2. Wallet for 3 token: 0:d8f69da3f9578ec0cde4bfe2beab88a70392a21a25a498a4a75f4e3a69a08c36
3. Third pair:
    1. Wallet for 3 token: 0:1001d5f7a12a2c1360ceefd7d855453d9fa82d694b6e843b7e3d59abaa0f8642
    2. Wallet for 1 token: 0:0b8cc4c854130d7ed222fe2c5954b9c192c8a00fe89fb933b47fbbc55fc95ea5

TIP-3 root token contracts: 
1. 0:0c4cad39cf61d92df6ab7c78552441b0524973e282f1e7a6acf5f06773cdc605
2. 0:e5863ff972464c4200dba9ed764d3a57533adb2bd4e88b9230859d1953b4b1d4
3. 0:9147ee4e3cb5ab00b755317c65fe0191bd740f946218a2dadef0de8bf1d7b95a

TIP-3 token wallets:
1. Profile 1
    1. 0:bf179c1527d1a266753e1b4e5bc698ed7540ef0bcbfe1b72cc39407a88b56984
    2. 0:8b0ecdad615907decf32fc26b3c964c173996c1c6f3e299289ecf56f3cd7dc87
    3. 0:e41b30802604c0fcbffc3fe0e2296282e18bb37cc71a1708e952774d4b8f2f62
2. Profile 2
    1. 0:17dd18f4e9c67354af36bb8f518883418ff03f4afcd93bb4577e23917734f718
    2. 0:76e5abdcecc2c25181ca59a9cc9beed166fccec028aba051bab57a84f7dc45ef
    3. 0:fee9eb4c1cadd7ec6ec54db3ded7875cbfd10913572cef6bb2028e9ecdc49052
3. Profile 3
    1. 0:b26e48c6ea75ab1b061dbe73e5a98067078923f2910f6e7a8c2bfb9246a69289
    2. 0:e7a46c983a139e6a6f869753178f8682bf07ed511645a7749c087ae5a8d00e09
    3. 0:f4041c21ebfa6aa6f502425595a83cd7bef6ae2124e5d824c1e3026f56317cbb
4. Profile 4
    1. 0:eb3f37c894bd865ed54bc11da4c170833643287402b752393cbc012520a7908b
    2. 0:1e446b9f3c84dbd0da7ff71715d118c0bf61923342127bde95a344249784d099
    3. 0:ac78c499a2036e86f5a1497daf6dd20d639735a45a7c26f4411e0141b74d2d8d
5. Profile 5
    1. 0:b8362be385b572a45c66804873a95034c6b2873e258d321b07f53a7f0cea0e83
    2. 0:5306be47c46aa1012fbdc2126e1033b61cfa5747352d10539e0059d3f3418fdb
    3. 0:baa3137966a0fc4ba75fd7e10528620ceef20b9c2a3edb01037c6f9cad42adc1

# Debots

Debot addresses in devnet: \
v 0.1.0: 0:c38e272ff7fd288c0a72c5fc01205e87913ab0c5a17744dc277f88e152862ceb \
v 0.2.0 (20-03-2021 upd): 0:6cd3dd396cbdbac5df20372b8f4727c7a15938950c90349c93313cd818c90ed4

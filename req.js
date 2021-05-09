const giverConfig = require('./config/contracts/giverConfig');
const networkConfig = require('./config/general/networkConfig');
const seedPhraseConfig = require('./config/general/seedPhraseConfig');
const { TonClient, signerNone, abiContract } = require("@tonclient/core");
const freeton = require('./src');
const { address, abi } = require('./config/contracts/giverConfig');

const fs = require('fs');

const ton = new freeton.TonWrapper({
    giverConfig: giverConfig,
    network: networkConfig.network,
    seed: seedPhraseConfig
});

aa = process.argv[2];
accountType = process.argv[3];
isInternal = process.argv[4] == '1' ? true : false;
incomingMessage = process.argv[5] == '1' ? 'dst' : 'src';
dirWithAbi = process.argv[6] ? process.argv[6] : './build/';

function loadAbi(type) {
    if (type == 'w')
        return JSON.parse(fs.readFileSync('build/TONTokenWallet.abi.json'));
    // return { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [{ "name": "constructor", "inputs": [], "outputs": [] }, { "name": "getVersion", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "name": "value0", "type": "uint32" }] }, { "name": "balance", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "name": "value0", "type": "uint128" }] }, { "name": "getDetails", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "components": [{ "name": "root_address", "type": "address" }, { "name": "code", "type": "cell" }, { "name": "wallet_public_key", "type": "uint256" }, { "name": "owner_address", "type": "address" }, { "name": "balance", "type": "uint128" }, { "name": "receive_callback", "type": "address" }, { "name": "bounced_callback", "type": "address" }, { "name": "allow_non_notifiable", "type": "bool" }], "name": "value0", "type": "tuple" }] }, { "name": "accept", "inputs": [{ "name": "tokens", "type": "uint128" }], "outputs": [] }, { "name": "allowance", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "components": [{ "name": "remaining_tokens", "type": "uint128" }, { "name": "spender", "type": "address" }], "name": "value0", "type": "tuple" }] }, { "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "remaining_tokens", "type": "uint128" }, { "name": "tokens", "type": "uint128" }], "outputs": [] }, { "name": "disapprove", "inputs": [], "outputs": [] }, { "name": "transferToRecipient", "inputs": [{ "name": "recipient_public_key", "type": "uint256" }, { "name": "recipient_address", "type": "address" }, { "name": "tokens", "type": "uint128" }, { "name": "deploy_grams", "type": "uint128" }, { "name": "transfer_grams", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "notify_receiver", "type": "bool" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "transfer", "inputs": [{ "name": "to", "type": "address" }, { "name": "tokens", "type": "uint128" }, { "name": "grams", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "notify_receiver", "type": "bool" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "transferFrom", "inputs": [{ "name": "from", "type": "address" }, { "name": "to", "type": "address" }, { "name": "tokens", "type": "uint128" }, { "name": "grams", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "notify_receiver", "type": "bool" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "internalTransfer", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "sender_public_key", "type": "uint256" }, { "name": "sender_address", "type": "address" }, { "name": "send_gas_to", "type": "address" }, { "name": "notify_receiver", "type": "bool" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "internalTransferFrom", "inputs": [{ "name": "to", "type": "address" }, { "name": "tokens", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "notify_receiver", "type": "bool" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "burnByOwner", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "grams", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "callback_address", "type": "address" }, { "name": "callback_payload", "type": "cell" }], "outputs": [] }, { "name": "burnByRoot", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "send_gas_to", "type": "address" }, { "name": "callback_address", "type": "address" }, { "name": "callback_payload", "type": "cell" }], "outputs": [] }, { "name": "setReceiveCallback", "inputs": [{ "name": "receive_callback_", "type": "address" }, { "name": "allow_non_notifiable_", "type": "bool" }], "outputs": [] }, { "name": "setBouncedCallback", "inputs": [{ "name": "bounced_callback_", "type": "address" }], "outputs": [] }, { "name": "destroy", "inputs": [{ "name": "gas_dest", "type": "address" }], "outputs": [] }], "data": [{ "key": 1, "name": "root_address", "type": "address" }, { "key": 2, "name": "code", "type": "cell" }, { "key": 3, "name": "wallet_public_key", "type": "uint256" }, { "key": 4, "name": "owner_address", "type": "address" }], "events": [] };
    if (type == 'p')
        return JSON.parse(fs.readFileSync('build/SwapPairContract.abi.json'));
    // return { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [{ "name": "constructor", "inputs": [{ "name": "rootContract", "type": "address" }, { "name": "spd", "type": "uint256" }, { "name": "tip3Deployer_", "type": "address" }], "outputs": [] }, { "name": "getT1Info", "inputs": [], "outputs": [{ "components": [{ "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "wallet_code", "type": "cell" }, { "name": "root_public_key", "type": "uint256" }, { "name": "root_owner_address", "type": "address" }, { "name": "total_supply", "type": "uint128" }], "name": "value0", "type": "tuple" }] }, { "name": "getT2Info", "inputs": [], "outputs": [{ "components": [{ "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "wallet_code", "type": "cell" }, { "name": "root_public_key", "type": "uint256" }, { "name": "root_owner_address", "type": "address" }, { "name": "total_supply", "type": "uint128" }], "name": "value0", "type": "tuple" }] }, { "name": "getWalletAddressCallback", "inputs": [{ "name": "walletAddress", "type": "address" }], "outputs": [] }, { "name": "_receiveTIP3Details", "inputs": [{ "components": [{ "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "wallet_code", "type": "cell" }, { "name": "root_public_key", "type": "uint256" }, { "name": "root_owner_address", "type": "address" }, { "name": "total_supply", "type": "uint128" }], "name": "rtcd", "type": "tuple" }], "outputs": [] }, { "name": "getTokenInfoCount", "inputs": [], "outputs": [{ "name": "value0", "type": "uint8" }] }, { "name": "_prepareDataForTIP3Deploy", "inputs": [], "outputs": [] }, { "name": "_deployTIP3LpToken", "inputs": [{ "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }], "outputs": [] }, { "name": "_deployTIP3LpTokenCallback", "inputs": [{ "name": "tip3RootContract", "type": "address" }], "outputs": [] }, { "name": "getPairInfo", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "components": [{ "name": "rootContract", "type": "address" }, { "name": "tokenRoot1", "type": "address" }, { "name": "tokenRoot2", "type": "address" }, { "name": "lpTokenRoot", "type": "address" }, { "name": "tokenWallet1", "type": "address" }, { "name": "tokenWallet2", "type": "address" }, { "name": "lpTokenWallet", "type": "address" }, { "name": "deployerPubkey", "type": "uint256" }, { "name": "deployTimestamp", "type": "uint256" }, { "name": "swapPairAddress", "type": "address" }, { "name": "uniqueId", "type": "uint256" }, { "name": "swapPairCodeVersion", "type": "uint32" }], "name": "info", "type": "tuple" }] }, { "name": "getExchangeRate", "inputs": [{ "name": "_answer_id", "type": "uint32" }, { "name": "swappableTokenRoot", "type": "address" }, { "name": "swappableTokenAmount", "type": "uint128" }], "outputs": [{ "components": [{ "name": "swappableTokenAmount", "type": "uint128" }, { "name": "targetTokenAmount", "type": "uint128" }, { "name": "fee", "type": "uint128" }], "name": "value0", "type": "tuple" }] }, { "name": "getCurrentExchangeRate", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "name": "value0", "type": "uint128" }, { "name": "value1", "type": "uint128" }] }, { "name": "getProvidingLiquidityInfo", "inputs": [{ "name": "maxFirstTokenAmount", "type": "uint128" }, { "name": "maxSecondTokenAmount", "type": "uint128" }], "outputs": [{ "name": "providedFirstTokenAmount", "type": "uint128" }, { "name": "providedSecondTokenAmount", "type": "uint128" }] }, { "name": "getWithdrawingLiquidityInfo", "inputs": [{ "name": "liquidityTokensAmount", "type": "uint256" }], "outputs": [{ "name": "withdrawedFirstTokenAmount", "type": "uint128" }, { "name": "withdrawedSecondTokenAmount", "type": "uint128" }] }, { "name": "getAnotherTokenProvidingAmount", "inputs": [{ "name": "providingTokenRoot", "type": "address" }, { "name": "providingTokenAmount", "type": "uint128" }], "outputs": [{ "name": "anotherTokenAmount", "type": "uint128" }] }, { "name": "tokensReceivedCallback", "inputs": [{ "name": "token_wallet", "type": "address" }, { "name": "token_root", "type": "address" }, { "name": "amount", "type": "uint128" }, { "name": "sender_public_key", "type": "uint256" }, { "name": "sender_address", "type": "address" }, { "name": "sender_wallet", "type": "address" }, { "name": "original_gas_to", "type": "address" }, { "name": "updated_balance", "type": "uint128" }, { "name": "payload", "type": "cell" }], "outputs": [] }, { "name": "burnCallback", "inputs": [{ "name": "tokensBurnt", "type": "uint128" }, { "name": "payload", "type": "cell" }, { "name": "sender_public_key", "type": "uint256" }, { "name": "sender_address", "type": "address" }, { "name": "wallet_address", "type": "address" }, { "name": "send_gas_to", "type": "address" }], "outputs": [] }, { "name": "_externalSwap", "inputs": [{ "name": "args", "type": "cell" }, { "name": "tokenReceiver", "type": "address" }, { "name": "token_root", "type": "address" }, { "name": "amount", "type": "uint128" }, { "name": "sender_wallet", "type": "address" }, { "name": "sender_address", "type": "address" }], "outputs": [] }, { "name": "_externalLiquidityProviding", "inputs": [{ "name": "args", "type": "cell" }, { "name": "tokenReceiver", "type": "address" }, { "name": "sender_public_key", "type": "uint256" }, { "name": "sender_address", "type": "address" }, { "name": "amount", "type": "uint128" }, { "name": "sender_wallet", "type": "address" }], "outputs": [] }, { "name": "_externalProvideLiquidityOneToken", "inputs": [], "outputs": [] }, { "name": "_externalWithdrawLiquidity", "inputs": [{ "name": "args", "type": "cell" }, { "name": "amount", "type": "uint128" }, { "name": "sender_address", "type": "address" }, { "name": "sender_wallet", "type": "address" }, { "name": "tokensBurnt", "type": "bool" }], "outputs": [] }, { "name": "_externalWithdrawLiquidityOneToken", "inputs": [], "outputs": [] }, { "name": "createSwapPayload", "inputs": [{ "name": "sendTokensTo", "type": "address" }], "outputs": [{ "name": "value0", "type": "cell" }] }, { "name": "createProvideLiquidityPayload", "inputs": [{ "name": "tip3Address", "type": "address" }], "outputs": [{ "name": "value0", "type": "cell" }] }, { "name": "createProvideLiquidityOneTokenPayload", "inputs": [], "outputs": [{ "name": "value0", "type": "cell" }] }, { "name": "createWithdrawLiquidityPayload", "inputs": [{ "name": "tokenRoot1", "type": "address" }, { "name": "tokenWallet1", "type": "address" }, { "name": "tokenRoot2", "type": "address" }, { "name": "tokenWallet2", "type": "address" }], "outputs": [{ "name": "value0", "type": "cell" }] }, { "name": "createWithdrawLiquidityOneTokenPayload", "inputs": [], "outputs": [{ "name": "value0", "type": "cell" }] }, { "name": "updateSwapPairCode", "inputs": [{ "name": "newCode", "type": "cell" }, { "name": "newCodeVersion", "type": "uint32" }], "outputs": [] }, { "name": "checkIfSwapPairUpgradeRequired", "inputs": [{ "name": "newCodeVersion", "type": "uint32" }], "outputs": [{ "name": "value0", "type": "bool" }] }, { "name": "kLast", "inputs": [], "outputs": [{ "name": "kLast", "type": "uint256" }] }], "data": [{ "key": 1, "name": "token1", "type": "address" }, { "key": 2, "name": "token2", "type": "address" }, { "key": 3, "name": "swapPairID", "type": "uint256" }], "events": [{ "name": "Swap", "inputs": [{ "name": "swappableTokenRoot", "type": "address" }, { "name": "targetTokenRoot", "type": "address" }, { "name": "swappableTokenAmount", "type": "uint128" }, { "name": "targetTokenAmount", "type": "uint128" }, { "name": "fee", "type": "uint128" }], "outputs": [] }, { "name": "ProvideLiquidity", "inputs": [{ "name": "liquidityTokensAmount", "type": "uint256" }, { "name": "firstTokenAmount", "type": "uint128" }, { "name": "secondTokenAmount", "type": "uint128" }], "outputs": [] }, { "name": "WithdrawLiquidity", "inputs": [{ "name": "liquidityTokensAmount", "type": "uint256" }, { "name": "firstTokenAmount", "type": "uint128" }, { "name": "secondTokenAmount", "type": "uint128" }], "outputs": [] }, { "name": "UpdateSwapPairCode", "inputs": [{ "name": "newCodeVersion", "type": "uint32" }], "outputs": [] }] };
    if (type == 'rpc')
        return JSON.parse(fs.readFileSync('build/RootSwapPairContract.abi.json'));
    // return { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [{ "name": "constructor", "inputs": [{ "name": "spCode", "type": "cell" }, { "name": "spCodeVersion", "type": "uint32" }, { "name": "minMsgValue", "type": "uint256" }, { "name": "contractSP", "type": "uint256" }, { "name": "tip3Deployer_", "type": "address" }], "outputs": [] }, { "name": "setTIP3DeployerAddress", "inputs": [{ "name": "tip3Deployer_", "type": "address" }], "outputs": [] }, { "name": "deploySwapPair", "inputs": [{ "name": "tokenRootContract1", "type": "address" }, { "name": "tokenRootContract2", "type": "address" }], "outputs": [{ "name": "cA", "type": "address" }] }, { "name": "getPairInfo", "inputs": [{ "name": "tokenRootContract1", "type": "address" }, { "name": "tokenRootContract2", "type": "address" }], "outputs": [{ "components": [{ "name": "rootContract", "type": "address" }, { "name": "tokenRoot1", "type": "address" }, { "name": "tokenRoot2", "type": "address" }, { "name": "lpTokenRoot", "type": "address" }, { "name": "tokenWallet1", "type": "address" }, { "name": "tokenWallet2", "type": "address" }, { "name": "lpTokenWallet", "type": "address" }, { "name": "deployerPubkey", "type": "uint256" }, { "name": "deployTimestamp", "type": "uint256" }, { "name": "swapPairAddress", "type": "address" }, { "name": "uniqueId", "type": "uint256" }, { "name": "swapPairCodeVersion", "type": "uint32" }], "name": "value0", "type": "tuple" }] }, { "name": "getServiceInformation", "inputs": [], "outputs": [{ "components": [{ "name": "ownerPubkey", "type": "uint256" }, { "name": "contractBalance", "type": "uint256" }, { "name": "creationTimestamp", "type": "uint256" }, { "name": "codeVersion", "type": "uint32" }, { "name": "swapPairCode", "type": "cell" }], "name": "value0", "type": "tuple" }] }, { "name": "checkIfPairExists", "inputs": [{ "name": "tokenRootContract1", "type": "address" }, { "name": "tokenRootContract2", "type": "address" }], "outputs": [{ "name": "value0", "type": "bool" }] }, { "name": "getFutureSwapPairAddress", "inputs": [{ "name": "tokenRootContract1", "type": "address" }, { "name": "tokenRootContract2", "type": "address" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "swapPairInitializedCallback", "inputs": [{ "components": [{ "name": "rootContract", "type": "address" }, { "name": "tokenRoot1", "type": "address" }, { "name": "tokenRoot2", "type": "address" }, { "name": "lpTokenRoot", "type": "address" }, { "name": "tokenWallet1", "type": "address" }, { "name": "tokenWallet2", "type": "address" }, { "name": "lpTokenWallet", "type": "address" }, { "name": "deployerPubkey", "type": "uint256" }, { "name": "deployTimestamp", "type": "uint256" }, { "name": "swapPairAddress", "type": "address" }, { "name": "uniqueId", "type": "uint256" }, { "name": "swapPairCodeVersion", "type": "uint32" }], "name": "spi", "type": "tuple" }], "outputs": [] }, { "name": "setSwapPairCode", "inputs": [{ "name": "code", "type": "cell" }, { "name": "codeVersion", "type": "uint32" }], "outputs": [] }, { "name": "upgradeSwapPair", "inputs": [{ "name": "uniqueID", "type": "uint256" }], "outputs": [] }], "data": [{ "key": 1, "name": "_randomNonce", "type": "uint256" }, { "key": 2, "name": "ownerPubkey", "type": "uint256" }], "events": [{ "name": "DeploySwapPair", "inputs": [{ "name": "swapPairAddress", "type": "address" }, { "name": "tokenRootContract1", "type": "address" }, { "name": "tokenRootContract2", "type": "address" }], "outputs": [] }, { "name": "SwapPairInitialized", "inputs": [{ "name": "swapPairAddress", "type": "address" }], "outputs": [] }, { "name": "SetSwapPairCode", "inputs": [{ "name": "codeVersion", "type": "uint32" }], "outputs": [] }, { "name": "UpgradeSwapPair", "inputs": [{ "name": "uniqueID", "type": "uint256" }, { "name": "codeVersion", "type": "uint32" }], "outputs": [] }] };
    if (type == 'tr')
        return JSON.parse(fs.readFileSync('build/RootTokenContract.abi.json'));
    // return { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [{ "name": "constructor", "inputs": [{ "name": "root_public_key_", "type": "uint256" }, { "name": "root_owner_address_", "type": "address" }], "outputs": [] }, { "name": "getVersion", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "name": "value0", "type": "uint32" }] }, { "name": "getDetails", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "components": [{ "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "wallet_code", "type": "cell" }, { "name": "root_public_key", "type": "uint256" }, { "name": "root_owner_address", "type": "address" }, { "name": "total_supply", "type": "uint128" }], "name": "value0", "type": "tuple" }] }, { "name": "getWalletAddress", "inputs": [{ "name": "_answer_id", "type": "uint32" }, { "name": "wallet_public_key_", "type": "uint256" }, { "name": "owner_address_", "type": "address" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "sendExpectedWalletAddress", "inputs": [{ "name": "wallet_public_key_", "type": "uint256" }, { "name": "owner_address_", "type": "address" }, { "name": "to", "type": "address" }], "outputs": [] }, { "name": "deployWallet", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "deploy_grams", "type": "uint128" }, { "name": "wallet_public_key_", "type": "uint256" }, { "name": "owner_address_", "type": "address" }, { "name": "gas_back_address", "type": "address" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "deployEmptyWallet", "inputs": [{ "name": "deploy_grams", "type": "uint128" }, { "name": "wallet_public_key_", "type": "uint256" }, { "name": "owner_address_", "type": "address" }, { "name": "gas_back_address", "type": "address" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "mint", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "to", "type": "address" }], "outputs": [] }, { "name": "proxyBurn", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "sender_address", "type": "address" }, { "name": "send_gas_to", "type": "address" }, { "name": "callback_address", "type": "address" }, { "name": "callback_payload", "type": "cell" }], "outputs": [] }, { "name": "tokensBurned", "inputs": [{ "name": "tokens", "type": "uint128" }, { "name": "sender_public_key", "type": "uint256" }, { "name": "sender_address", "type": "address" }, { "name": "send_gas_to", "type": "address" }, { "name": "callback_address", "type": "address" }, { "name": "callback_payload", "type": "cell" }], "outputs": [] }, { "name": "sendSurplusGas", "inputs": [{ "name": "to", "type": "address" }], "outputs": [] }, { "name": "setPaused", "inputs": [{ "name": "value", "type": "bool" }], "outputs": [] }, { "name": "sendPausedCallbackTo", "inputs": [{ "name": "callback_id", "type": "uint64" }, { "name": "callback_addr", "type": "address" }], "outputs": [] }, { "name": "transferOwner", "inputs": [{ "name": "root_public_key_", "type": "uint256" }, { "name": "root_owner_address_", "type": "address" }], "outputs": [] }, { "name": "name", "inputs": [], "outputs": [{ "name": "name", "type": "bytes" }] }, { "name": "symbol", "inputs": [], "outputs": [{ "name": "symbol", "type": "bytes" }] }, { "name": "decimals", "inputs": [], "outputs": [{ "name": "decimals", "type": "uint8" }] }, { "name": "wallet_code", "inputs": [], "outputs": [{ "name": "wallet_code", "type": "cell" }] }, { "name": "total_supply", "inputs": [], "outputs": [{ "name": "total_supply", "type": "uint128" }] }, { "name": "start_gas_balance", "inputs": [], "outputs": [{ "name": "start_gas_balance", "type": "uint128" }] }, { "name": "paused", "inputs": [], "outputs": [{ "name": "paused", "type": "bool" }] }], "data": [{ "key": 1, "name": "_randomNonce", "type": "uint256" }, { "key": 2, "name": "name", "type": "bytes" }, { "key": 3, "name": "symbol", "type": "bytes" }, { "key": 4, "name": "decimals", "type": "uint8" }, { "key": 5, "name": "wallet_code", "type": "cell" }], "events": [] };
    if (type == 'wd')
        return JSON.parse(fs.readFileSync('build/TONTokenWallet.abi.json'));
    // return { "ABI version": 2, "header": ["time", "expire"], "functions": [{ "name": "constructor", "inputs": [], "outputs": [] }, { "name": "deployEmptyWalletFor", "inputs": [{ "name": "pubkey", "type": "uint256" }, { "name": "addr", "type": "address" }], "outputs": [] }, { "name": "getAddress", "inputs": [{ "name": "a", "type": "address" }], "outputs": [] }, { "name": "getLatestPublicKey", "inputs": [], "outputs": [{ "name": "value0", "type": "uint256" }] }, { "name": "getLatestAddr", "inputs": [], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "getRoot", "inputs": [], "outputs": [{ "name": "value0", "type": "address" }] }], "data": [{ "key": 1, "name": "_randomNonce", "type": "uint256" }, { "key": 2, "name": "root", "type": "address" }], "events": [] };
    if (type == 'td')
        return JSON.parse(fs.readFileSync('build/TIP3TokenDeployer.abi.json'));
    // return { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [{ "name": "constructor", "inputs": [], "outputs": [] }, { "name": "deployTIP3Token", "inputs": [{ "name": "_answer_id", "type": "uint32" }, { "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "rootPublicKey", "type": "uint256" }, { "name": "rootOwnerAddress", "type": "address" }, { "name": "deployGrams", "type": "uint128" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "getFutureTIP3Address", "inputs": [{ "name": "_answer_id", "type": "uint32" }, { "name": "name", "type": "bytes" }, { "name": "symbol", "type": "bytes" }, { "name": "decimals", "type": "uint8" }, { "name": "rootPublicKey", "type": "uint256" }], "outputs": [{ "name": "value0", "type": "address" }] }, { "name": "setTIP3RootContractCode", "inputs": [{ "name": "rootContractCode_", "type": "cell" }], "outputs": [] }, { "name": "setTIP3WalletContractCode", "inputs": [{ "name": "walletContractCode_", "type": "cell" }], "outputs": [] }, { "name": "getServiceInfo", "inputs": [{ "name": "_answer_id", "type": "uint32" }], "outputs": [{ "components": [{ "name": "rootContractCode", "type": "cell" }, { "name": "walletContractCode", "type": "cell" }], "name": "value0", "type": "tuple" }] }], "data": [], "events": [] };
}

async function main() {

    await ton.setup(1);

    await ton.ton.net.query_collection({
        collection: 'accounts',
        filter: {
            id: { eq: aa }
        },
        result: 'balance acc_type'
    }).then(console.log).catch(console.log);

    abiA = loadAbi(accountType);

    filter = {}
    filter[incomingMessage] = { eq: aa };

    try {
        await ton.ton.net.query_collection({
            collection: 'messages',
            filter: filter,
            order: [{
                path: 'created_lt',
                direction: 'ASC'
            }],
            result: "id created_lt msg_type status src dst value boc body" // "account_addr aborted total_fees" //  
        }).then(async s => s.result.forEach(async(el) => {
            await ton.ton.abi.decode_message_body({
                body: el.body,
                is_internal: isInternal,
                abi: abiContract(abiA)
            }).then(k => {
                console.log('################################################');
                console.log(`source: ${el.src}`);
                console.log(`destination: ${el.dst}`);
                console.log(`value: ${el.value}`);
                console.log(`status: ${el.status}`);
                console.log(k);
            }).catch(k => {
                console.log('################################################');
                console.log(`source: ${el.src}`);
                console.log(`destination: ${el.dst}`);
                console.log(`value: ${el.value}`);
                console.log(`status: ${el.status}`);
                console.log(`Cannot decode`);
            });
        })).catch(console.log);
    } catch (err) {
        console.log(err);
    }

    //process.exit(0);
}

main();
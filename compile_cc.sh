#!/bin/bash

SC_DIR=$1
TARGET_DIR=$2
COMPILE_SH=$(cd $(dirname $0) && pwd)/compile_sc.sh

[ -z ${SC_DIR} ] && echo "SC dir does not exist" && exit 1
[ -z ${TARGET_DIR} ] && mkdir -p ${TARGET_DIR}

bash ${COMPILE_SH} . TestContract ${TARGET_DIR}

bash ${COMPILE_SH} ${SC_DIR}/RIP-3 TONTokenWallet $TARGET_DIR
bash ${COMPILE_SH} ${SC_DIR}/RIP-3 RootTokenContract $TARGET_DIR
bash ${COMPILE_SH} ${SC_DIR}/RIP-3/tests CallbackTestContract $TARGET_DIR
bash ${COMPILE_SH} ${SC_DIR}/RIP-3/tests DeployEmptyWalletFor $TARGET_DIR

bash ${COMPILE_SH} ${SC_DIR}/additional/ GiverContract ${TARGET_DIR}

bash ${COMPILE_SH} ${SC_DIR}/SwapPair RootSwapPairContract $TARGET_DIR
bash ${COMPILE_SH} ${SC_DIR}/SwapPair SwapPairContract $TARGET_DIR

# bash ${COMPILE_SH} ${SC_DIR}/testContracts testSetCode $TARGET_DIR
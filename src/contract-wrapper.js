const { QMessageType } = require('ton-client-js');
const fs = require('fs');
const BigNumber = require('bignumber.js');
const utils = require('./utils');


class OutputDecoder {
  constructor(output, functionAttributes) {
    this.output = output;
    this.functionAttributes = functionAttributes;
  }
  
  decode_value(encoded_value, schema) {
    switch (schema.type) {
      case 'bytes':
        return this.decodeBytes(encoded_value);
      case 'bytes[]':
        return this.decodeBytesArray(encoded_value);
      case 'cell':
        return encoded_value;
      case 'uint256':
      case 'uint160':
      case 'uint128':
      case 'uint64':
      case 'uint32':
      case 'uint16':
      case 'uint8':
        return this.decodeInt(encoded_value);
      case 'uint256[]':
      case 'uint128[]':
      case 'uint64[]':
      case 'uint32[]':
      case 'uint16[]':
      case 'uint8[]':
        return this.decodeIntArray(encoded_value);
      case 'bool':
        return this.decodeBool(encoded_value);
      case 'address':
        return encoded_value;
      case 'tuple':
        return this.decodeTuple(encoded_value, schema.components);
    }
  }
  
  decodeBytes(value) {
    return Buffer.from(value, 'hex');
  }
  
  decodeBytesArray(value) {
    return value.map(v => this.decodeBytes(v));
  }
  
  decodeBool(value) {
    return Boolean(value);
  }
  
  decodeInt(value) {
    return new BigNumber(value);
  }
  
  decodeIntArray(value) {
    return value.map(hexInt => BigInt(hexInt));
  }
  
  decode() {
    const outputDecoded = this.decodeTuple(
      this.output,
      this.functionAttributes.outputs
    );
    
    // Return single output without array notation
    if (Object.keys(outputDecoded).length === 1) {
      return Object.values(outputDecoded)[0];
    }
    
    return outputDecoded;
  }
  
  decodeTuple(value, schema) {
    const res_struct = {};
    
    schema.forEach((field_value_schema) => {
      const field_value = value[field_value_schema.name];
      res_struct[field_value_schema.name] = this.decode_value(field_value, field_value_schema)
    });
    
    return res_struct;
  }
}


class ContractWrapper {
  constructor(tonWrapper, abi, imageBase64, address) {
    this.tonWrapper = tonWrapper;
    this.abi = abi;
    this.imageBase64 = imageBase64;
    this.address = address;
  }
  
  /**
   * Deploy smart contract to the network
   * @dev Uses Giver contract to pay for deploy (https://docs.ton.dev/86757ecb2/p/00f9a3-ton-os-se-giver)
   * @param constructorParams Constructor params for contract constructor
   * @param initParams Contract initial params (static values in Solidity)
   * @param initialBalance TONs to request from giver for deployment
   * @param _randomNonce Special initParam - if true, set to random value. Gives easy way to deploy
   * @param keyPair Keys to use (first keys from the tonWrapper by default)
   * same contract on different addresses.
   * @param onlyDeriveAddress Return future address without actual deploy
   * @returns {Promise<void>}
   */
  async deploy(
    constructorParams={},
    initParams={},
    initialBalance=10000000000,
    _randomNonce=false,
    keyPair = undefined,
    onlyDeriveAddress = false
  ) {
    const deployParams = [
      this.imageBase64,
      constructorParams,
      _randomNonce === true ?
        {...initParams, _randomNonce: utils.getRandomNonce()} : initParams,
      keyPair,
    ];
    
    // Derive future contract address from the deploy message
    const {
      address: futureAddress,
    } = await this.createDeployMessage(...deployParams);
    
    // - Don't deploy contract, just return it's future address
    if (onlyDeriveAddress) {
      return futureAddress;
    }
    
    // Send grams from giver to pay for contract deployment
    const giverContract = new ContractWrapper(
      this.tonWrapper,
      this.tonWrapper.giverConfig.abi,
      null,
      this.tonWrapper.giverConfig.address,
    );
    
    await giverContract.run('sendGrams', {
      dest: futureAddress,
      amount: initialBalance,
    }, null);
    
    // Wait for receiving grams
    await this.tonWrapper.ton.net.wait_for_collection({
      collection: 'accounts',
      filter: {
        id: { eq: futureAddress },
        balance: { gt: `0x0` }
      },
      result: 'balance'
    });
    
    // Send the deploy message
    const deployMessage = await this.createDeployMessage(...deployParams);
    
    // - Wait deployment confirmed
    const status = await this.waitForRunTransaction(deployMessage);
    
    await this.tonWrapper.afterRunHook();
    
    this.address = futureAddress;
    
    return status;
  }
  
  /**
   * Check migration applied on this contract so address already exists
   * @dev load 'address' attribute from the migration-log.json file
   * @param alias Alias of the contract. If not specified - contract name is used
   * @returns {Promise<void>}
   */
  async loadMigration(alias) {
    const migrationLog = JSON.parse(fs.readFileSync('migration-log.json', 'utf8'));
    
    const aliasName = alias === undefined ? this.name : alias;
    
    if (migrationLog[aliasName] !== undefined) {
      this.address = migrationLog[aliasName].address;
    } else {
      throw new Error(`Contract ${aliasName} not found in the migration`);
    }
  }
  
  /**
   * Creates deploy message without broadcasting it.
   * @dev Useful for deriving contract address.
   * @param imageBase64 Base64 encoded code
   * @param constructorParams Constructor params for contract constructor
   * @param initParams Initial state params for the contract
   * @param _keyPair Keys to use (first keys from the tonWrapper by default)
   * @returns {Promise<*>}
   */
  async createDeployMessage(imageBase64, constructorParams, initParams, _keyPair) {
    const keyPair = _keyPair === undefined ? this.tonWrapper.keys[0] : _keyPair;

    let encodeParams = {
      abi: {
        type: "Contract",
        value: this.abi,
      },
      deploy_set: {
        tvc: imageBase64,
        initial_data: initParams,
      },
      call_set: {
        function_name: 'constructor',
        input: constructorParams,
      },
      signer: {
        type: 'None',
      }
    };
    
    if (keyPair) {
      encodeParams = {
        ...encodeParams,
        signer: {
          type: 'Keys',
          keys: keyPair,
        }
      }
    }
    
    return this.tonWrapper.ton.abi.encode_message(encodeParams);
  }
  
  /**
   * Handy way to wait until message confirmed or reverted
   * @dev Works both with deploy and run messages
   * @param message TON message to distribute
   * @returns {Promise<void>}
   */
  async waitForRunTransaction(message) {
    const {
      shard_block_id,
    } = await this
      .tonWrapper
      .ton
      .processing
      .send_message({
        message: message.message,
        send_events: false,
      });
    
    return this
      .tonWrapper
      .ton
      .processing
      .wait_for_transaction({
        message: message.message,
        shard_block_id,
        send_events: false,
        abi: {
          type: 'Contract',
          value: this.abi
        },
      });
  }
  
  /**
   * Run method function (in terms of TON - call).
   * @param functionName Name of the function
   * @param input Dict of method parameters
   * @param _keyPair Key pair to sign the message
   * @returns {Promise<void>}
   */
  async run(functionName, input={}, _keyPair) {
    const runMessage = await this.getRunMessage(functionName, input, _keyPair);

    const status = await this.waitForRunTransaction(runMessage);

    await this.tonWrapper.afterRunHook();

    return status;
  }
  
  async getRunMessage(functionName, input={}, _keyPair) {
    const keyPair = _keyPair === undefined ? this.tonWrapper.keys[0] : _keyPair;
  
    let encodeParams = {
      address: this.address,
      abi: {
        type: "Contract",
        value: this.abi,
      },
      call_set: {
        function_name: functionName,
        input,
      },
      signer: {
        type: 'None',
      }
    };
  
    if (keyPair) {
      encodeParams = {
        ...encodeParams,
        signer: {
          type: 'Keys',
          keys: keyPair,
        }
      }
    }

    return this.tonWrapper.ton.abi.encode_message(encodeParams);
  }
  
  /**
   * Run message locally (in terms of TON - run).
   * @param functionName
   * @param input
   * @returns {Promise<ResultOfRunExecutor>}
   */
  async runLocal(functionName, input={}) {
    const runMessage = await this.getRunMessage(
      functionName,
      input,
      this.tonWrapper.keys[0]
    );
    
    const {
      result: [{
        boc
      }]
    } = await this.tonWrapper.ton.net.query_collection({
      collection: 'accounts',
      filter: {
        id: {
          eq: this.address,
        }
      },
      result: 'boc'
    });
    
    const {
      decoded: {
        output,
      }
    } = await this.tonWrapper.ton.tvm.run_executor({
      abi: {
        type: 'Contract',
        value: this.abi
      },
      message: runMessage.message,
      account: {
        type: 'Account',
        boc
      },
    });
  
    const functionAttributes = this.abi.functions.find(({ name }) => name === functionName);
  
    const outputDecoder = new OutputDecoder(
      output,
      functionAttributes
    );
  
    return outputDecoder.decode();
  }
  
  /**
   * Decode list of messages according to the ABI
   * @param messages
   * @param is_internal
   * @param messageDirection
   * @returns {Promise<unknown[]>}
   */
  async decodeMessages(messages, is_internal, messageDirection) {
    const decodedMessages = messages.map(async (message) => {
      const decodedMessage = await this.tonWrapper.ton.abi.decode_message_body({
        abi: {
          type: 'Contract',
          value: this.abi
        },
        body: message.body,
        is_internal,
      });
  
      return {
        ...decodedMessage,
        messageId: message.id,
        src: message.src,
      };
    });
    
    return Promise.all(decodedMessages);
  }
  
  async getReceivedMessages(messageType, internal) {
    const messages = (await this.tonWrapper.ton.queries.messages.query({
        dst: { eq: this.address },
        msg_type: { eq: messageType }
      },
      'body id src',
    ));
    
    return this.decodeMessages(messages, internal, 'input');
  }
  
  /**
   * Get list of messages, sent from the contract
   * @param messageType Message type
   * @param internal Internal type
   * @returns {Promise<unknown[]>} List of messages
   */
  async getSentMessages(messageType, internal) {
    const {
      result
    } = (await this.tonWrapper.ton.net.query_collection({
        collection: 'messages',
        filter: {
          src: {eq: this.address},
          msg_type: {eq: messageType}
        },
        result: 'body id src',
      }
    ));
    
    return this.decodeMessages(result, internal, 'output');
  }
  
  /**
   * Get solidity events, emitted by the contract.
   * @dev Under the hood, events are extOut messages
   * @param eventName Event name
   * @returns {Promise<*>} List of emitted events
   */
  async getEvents(eventName) {
    const sentMessages = await this.getSentMessages(QMessageType.extOut, false);
    
    return sentMessages.filter((message) => message.name === eventName);
  }
}


const requireContract = async (tonWrapper, name, address) => {
  const contractBase64 = utils.loadBase64FromFile(`build/${name}.base64`);
  const contractABI = utils.loadJSONFromFile(`build/${name}.abi.json`);
  
  const {
    code: contractCode
  } = await tonWrapper
    .ton
    .boc
    .get_code_from_tvc({
      tvc: contractBase64,
    });
  
  const contractInstance = new ContractWrapper(
    tonWrapper,
    contractABI,
    contractBase64
  );
  
  contractInstance.code = contractCode;
  contractInstance.name = name;
  
  if (address) {
    contractInstance.address = address;
  }
  
  return contractInstance;
};

module.exports = {
  OutputDecoder,
  ContractWrapper,
  requireContract,
};

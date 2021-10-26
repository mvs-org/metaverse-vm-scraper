const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+5
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const provider = new HttpProvider(NEW_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
var utils = web3.utils;
//var utils = web3.utils;
var mvs = web3.eth;

// Mnemonic: cube word sleep actress grain defy danger forum cradle reunion tell garlic
// addr: 0x245002bB48770DA62ee46Acb0586D27a67C97fa7
var ADDR = '0x245002bB48770DA62ee46Acb0586D27a67C97fa7'
var PRI_KEY = Buffer.from('7d3f4da91f313ed9bca02162cf2bde22de84db025f658f9ffeb5e5d382344f32', 'hex'); // private key
var to_addr = '0x3126D7C4c61C4cd154D7C1d7Aef3470d38F2B9b0';

//var send_value = '117015.5'; // 4.3*39005 gwei
//send_value = utils.toWei(send_value, 'gwei');
//send_value = utils.toWei(send_value, 'ether');

// gas price
const gas_price = utils.toWei('1', 'wei');
const gas_limit = '60000'; //39000


async function main () {

	var value = '1'; // ether
	value = utils.toWei(value, 'ether');
	var nonce = await mvs.getTransactionCount(ADDR, 'latest')
					.catch(console.log);;
	//console.log('nonce: '+nonce);
	await SendTx(nonce, to_addr, value);
}

async function SendRaw () {
	var tx_raw = '0xf86b80843b9aca00825208945c3068073f94145c3363969ab4b76b7639b89c87881bc16d674ec800008051a0e33e38bcc1238e09a17f88fc6dbabcba0434d7448236a8dbdfd4931f5762aae8a0154b2acbb19071343d8bf48942a41f81c0cb86199a6f6aaa68f80db0cb83987e'
	mvs.sendSignedTransaction(tx_raw)
			        .on('receipt', console.log)
			        .catch(console.log);

	var tx_raw = '0xf86b01843b9aca00825208945c3068073f94145c3363969ab4b76b7639b89c87880de0b6b3a76400008052a00ae6ff8637d91922a1f121dab720270adaa90848f5c60d5602518c0eee911f39a015b3b7d2230f3fa49d74b3baf887ebd034f6cefc7d11e0b26902245815ea870f'
    mvs.sendSignedTransaction(tx_raw)
			        .on('receipt', console.log)
			        .catch(console.log);

	var tx_raw = '0xf86b02843b9aca00825208945c3068073f94145c3363969ab4b76b7639b89c87880de0b6b3a76400008052a05fcd460282870300223fbc8ea43e9b3c516fade56c3feb496c79eb90d14117d8a06cad3284ff6f87c9088f54a4e55664cf94f35a11ab58eb9ecf4065b363095eae'
    mvs.sendSignedTransaction(tx_raw)
			        .on('receipt', console.log)
			        .catch(console.log);
	console.log("tx sent");
}

async function SendTx (nonce, addr, value) {
    const txParams = {
        nonce: utils.toHex(nonce),
        gasPrice: utils.toHex(gas_price),
        gasLimit: utils.toHex(gas_limit),
        to: addr,
        value: utils.toHex(value),
        data: null,
    };
    console.log('txParams: '+JSON.stringify(txParams));

    //sign tx
    var tx = new EthereumTx(txParams, {chain: 'mainnet', hardfork: 'homestead'});
    tx.sign(PRI_KEY);
    var serializedTx = tx.serialize();
    console.log(serializedTx.toString('hex'));

    //broadcast tx
    await mvs.sendSignedTransaction('0x' + serializedTx.toString('hex'))
        .on('receipt', console.log)
        .catch(err => console.log('err: '+err.message));

}

main().catch(console.error).finally(() => process.exit());
//SendRaw().catch(console.error);


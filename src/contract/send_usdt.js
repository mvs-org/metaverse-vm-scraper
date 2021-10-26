const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const {eusdt_abi, eusdt_caddr} = require('./eusdt.js')

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+5
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'

const provider = new HttpProvider(RPC_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var utils = web3.utils;
var mvs = web3.eth;

// Mnemonic: cube word sleep actress grain defy danger forum cradle reunion tell garlic
// addr: 0x245002bB48770DA62ee46Acb0586D27a67C97fa7
var ADDR = '0x245002bB48770DA62ee46Acb0586D27a67C97fa7'
var PRI_KEY = Buffer.from('7d3f4da91f313ed9bca02162cf2bde22de84db025f658f9ffeb5e5d382344f32', 'hex'); // private key
var to_addr = '0x3126D7C4c61C4cd154D7C1d7Aef3470d38F2B9b0';


// gas price
const gas_price = utils.toWei('1', 'wei');
const gas_limit = '80000'; //39000

const u_coin = new mvs.Contract(eusdt_abi, eusdt_caddr);

async function main () {

	var value = '300000'; // wei
	//value = utils.toWei(value, 'ether');
	
	await SendUsdt(to_addr, value);

	await GetBalance(ADDR);
}


async function SendUsdt (to_addr, value) {
	var nonce = await mvs.getTransactionCount(ADDR, 'latest')
					.catch(console.log);
	//console.log('nonce: '+nonce);

	var abidata =  u_coin.methods.transfer(to_addr, value).encodeABI();
    const txParams = {
        nonce: utils.toHex(nonce),
        gasPrice: utils.toHex(gas_price),
        gasLimit: utils.toHex(gas_limit),
        to: eusdt_caddr,
        value: null,
        data: abidata,
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

async function GetBalance (addr) {
    u_coin.methods.balanceOf(addr).call(function(e, res){
        if (!e)
        {
            var balance = res.toString();
            console.log(balance);
        } else {
            console.log(e);
        }
    });

}

main().catch(console.error)



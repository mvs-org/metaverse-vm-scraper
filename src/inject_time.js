const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const axios = require('axios');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const CHAIN_DATA_PATH = path.join(__dirname, './chaindata', 'chain_100000.json');
const ERR_TX_PATH = path.join(__dirname, './', 'err_tx.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9933'

const provider = new HttpProvider(NEW_URL);
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
var frontier = new_web3.eth;

const sleep = (ms) => 
  new Promise((resolve) => setTimeout(resolve, ms));

async function main () {
	// Create the API and wait until ready
	let api;
	if (!fs.existsSync(SCHEMA_PATH)) {
		console.log('Custom Schema missing, using default schema.');
		api = await ApiPromise.create({ provider });
	} else {
		const { types, rpc } = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
		api = await ApiPromise.create({
		  provider,
		  types,
		  rpc,
		});
	}

	let chain;
	if (!fs.existsSync(CHAIN_DATA_PATH)) {
		console.log('Chain data missing.');
		return;
	} else {
		chain = JSON.parse(fs.readFileSync(CHAIN_DATA_PATH, 'utf8'));
	}

	for (const block of chain) {
		if (block.block < START_BLOCK) {
			continue;
		}
		if (block.block > END_BLOCK) {
			break;
		}

		await api.tx.timestamp.set(block.timestamp);
		
		// use custom manual-seal RPC params
		const create_block = {
			jsonrpc:"2.0",
			id:1,
			method:"engine_createBlock",
			params: [true, false, block.timestamp, null]
		}
		await axios.post(NEW_URL, create_block).catch(console.log);


		//await sleep(100);

	}



}



main().catch(console.error).finally(() => process.exit());

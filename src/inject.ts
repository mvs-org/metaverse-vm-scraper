const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const provider = new HttpProvider(NEW_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
//var utils = web3.utils;
var mvs = web3.eth;
var frontier = new_web3.eth;

const sleep = (ms: number): Promise<void> =>
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

	let blockNumber = START_BLOCK
	while(blockNumber<=END_BLOCK){
		let count = await mvs.getBlockTransactionCount(blockNumber)
		let cn = parseInt(count)
		//console.log(`block count: ${cn}`)
		
		if (cn > 0) {
			const block = await mvs.getBlock(blockNumber)
			console.log(`block ${block.number}: ${block.hash}`)
			let index = 0
			for (const txid of block.transactions) {
				const tx = await mvs.getTransaction(txid)
				console.log(`tx ${index}: ${tx.hash}`)
				console.log(tx.raw)
				index++

				// shouldn't await coz using manual-seal
				frontier.sendSignedTransaction(tx.raw)
			        .on('receipt', console.log)
			        .catch(console.log);
			}
			console.log('--------------')
			// sleep 200ms for tx to be surely injected into block
			await sleep(200);
		} 
		
		let ret = await api.rpc.engine.createBlock(true, false)
		console.log(`seal block hash: ${ret.hash}`)
		blockNumber++

	}
}

main().catch(console.error).finally(() => process.exit());

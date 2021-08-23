const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const axios = require('axios');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const CHAIN_DATA_PATH = path.join(__dirname, './', 'chain_200000.json');
const ERR_TX_PATH = path.join(__dirname, './', 'err_tx.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const provider = new HttpProvider(NEW_URL);
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
var frontier = new_web3.eth;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

var err_tx = [];
function handle_err_tx (e: Error, block_nr: number, tx_hash: string) {
	console.log(e);
	var block = {
			block: block_nr,
			tx_hash: tx_hash,
		}

	err_tx.push(block);
}

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

		if (block.tx_raw.length > 0) {
			console.log(`block ${block.block}: `)
			for (let i = 0; i < block.tx_raw.length; i++) {
				var tx = block.tx_hash[i];
				var tx_raw = block.tx_raw[i];
				console.log(`tx ${i}: ${tx}`)

				// shouldn't await coz using manual-seal
				frontier.sendSignedTransaction(tx_raw)
			        .on('receipt', console.log)
			        .catch(e => handle_err_tx(e, block.block, block.tx_hash[i]))
			  await sleep(50);
			}
			console.log('--------------')

			// sleep 200ms for tx to be surely injected into block
			await sleep(200);
		} 
		
		// use custom manual-seal RPC params
		const create_block = {
			jsonrpc:"2.0",
			id:1,
			method:"engine_createBlock",
			params: [true, false, block.timestamp, null]
		}
		await axios.post(NEW_URL, create_block).catch(console.log);

	}

	// wait for tx receipt
	await sleep(10000);

	// pretty-print JSON object to string
	const data = JSON.stringify(err_tx, null, 4);
	try {
	    fs.writeFileSync(ERR_TX_PATH, data);
	    console.log("err_tx is saved.");
	} catch (err) {
	    console.error(err);
	}
}



main().catch(console.error).finally(() => process.exit());

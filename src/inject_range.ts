const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const axios = require('axios');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+5
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const hprovider = new HttpProvider(RPC_URL);
const provider = new HttpProvider(NEW_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
//var utils = web3.utils;
var mvs = web3.eth;
var frontier = new_web3.eth;

var block_range =  [5733,5737,5918,5977,8236,8585,10106,10658,10808,10821,10874,10881,10942,10964,10966,10968,10970,10971,10972,10973,10974,10975,10976,10977,10979,10980,10982,10983,10988,10989,11087,11111,11112,11116,11118,11124,11127,11129,11130,11138,11142,11145,11146,11152,11157,11165,11186,11191,11218,11222,11226,11229,11260,11263,11267,11271,11282,11284,11289,11710,11815,11819,11825,11828,11830,11832,11957];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main () {
	// Create the API and wait until ready
	let hapi, api;
	if (!fs.existsSync(SCHEMA_PATH)) {
		console.log('Custom Schema missing, using default schema.');
		hapi = await ApiPromise.create({ hprovider });
		api = await ApiPromise.create({ provider });
	} else {
		const { types, rpc } = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
		hapi = await ApiPromise.create({
		  hprovider,
		  types,
		  rpc,
		});
		api = await ApiPromise.create({
		  provider,
		  types,
		  rpc,
		});
	}

	for (const nr of block_range) {
		const blockHash = await hapi.rpc.chain.getBlockHash(nr);
    const hblock = await hapi.rpc.chain.getBlock(blockHash);

    let timestamp;
    for (const ex of hblock.block.extrinsics) {
        //console.log(`block:${nr} info:`, ex.toHuman())
        const {isSigned, meta, method: {args, method, section}} = ex;
        if (method == 'set' && section == 'timestamp') {
        	 // copy the timestamp to new-frontiers
          timestamp = parseInt(args[0]);
          break;
        }
    };

		const block = await mvs.getBlock(nr)
		console.log(`block ${block.number}: `)
		let index = 0
		for (const txid of block.transactions) {
			const tx = await mvs.getTransaction(txid)
			console.log(`tx ${index}: ${tx.hash}`)
			//console.log(tx.raw)
			index++

			// shouldn't await coz using manual-seal
			frontier.sendSignedTransaction(tx.raw)
		        .on('receipt', console.log)
		        .catch(console.log);
		}
		console.log('--------------')
		// sleep 100ms for tx to be surely injected into block
		await sleep(100);

		//console.log(`timestamp: ${timestamp}`);

		// use custom manual-seal RPC params
		const create_block = {
			jsonrpc:"2.0",
			id:1,
			method:"engine_createBlock",
			params: [true, false, timestamp, null]
		}
		await axios.post(NEW_URL, create_block).catch(console.log);

	}

	await sleep(10000);
}


main().catch(console.error).finally(() => process.exit());

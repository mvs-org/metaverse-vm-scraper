const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const CHAIN_DATA_PATH = path.join(__dirname, './', 'chain.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const hprovider = new HttpProvider(RPC_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var mvs = web3.eth;

var chain = [];

async function main () {
	// Create the API and wait until ready
	let hapi;
	if (!fs.existsSync(SCHEMA_PATH)) {
		console.log('Custom Schema missing, using default schema.');
		hapi = await ApiPromise.create({ hprovider });
	} else {
		const { types, rpc } = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
		hapi = await ApiPromise.create({
		  hprovider,
		  types,
		  rpc,
		});
	}

	let blockNumber = START_BLOCK
	while(blockNumber<=END_BLOCK){
		const blockHash = await hapi.rpc.chain.getBlockHash(blockNumber);
	    const hblock = await hapi.rpc.chain.getBlock(blockHash);
	    let timestamp;
	    for (const ex of hblock.block.extrinsics) {
	        //console.log(`block:${blockNumber} info:`, ex.toHuman())
	        const {isSigned, meta, method: {args, method, section}} = ex;
	        if (method == 'set' && section == 'timestamp') {
	        	 // copy the timestamp to new-frontiers
	          timestamp = parseInt(args[0]);
	          break;
	        }
	    };

	    var tx_hash = [];
	    var tx_raw = [];
		var block = {
			block: blockNumber,
			timestamp: timestamp,
			tx_hash: tx_hash,
			tx_raw: tx_raw,
		}

		let count = await mvs.getBlockTransactionCount(blockNumber)
		let cn = parseInt(count)
		if (cn > 0) {
			const block = await mvs.getBlock(blockNumber)
			console.log(`block ${block.number}: `)

			let index = 0
			for (const txid of block.transactions) {
				const tx = await mvs.getTransaction(txid)
				console.log(`tx ${index}: ${tx.hash}`)
				tx_hash.push(tx.hash);
				tx_raw.push(tx.raw);
				index++
			}
			console.log('--------------')
		} 

		chain.push(block);
		blockNumber++
	}

	// pretty-print JSON object to string
	const data = JSON.stringify(chain, null, 4);
	try {
	    fs.writeFileSync(CHAIN_DATA_PATH, data);
	    console.log("Chain data is saved.");
	} catch (error) {
	    console.error(err);
	}
}


main().catch(console.error).finally(() => process.exit());

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const CHAIN_DATA_PATH = path.join(__dirname, './', 'chain_data.json');
const MISS_TX_PATH = path.join(__dirname, './', 'miss_tx.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9934'

var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var mvs = web3.eth;

var miss_txs = [];

async function main () {

	let chain;
	if (!fs.existsSync(CHAIN_DATA_PATH)) {
		console.log('chain data missing.');
		return;
	} else {
		chain = JSON.parse(fs.readFileSync(CHAIN_DATA_PATH, 'utf8'));
	}

    for (const entry of chain) {
    	if (entry.block < START_BLOCK) {
			continue;
		}
		if (entry.block > END_BLOCK) {
			break;
		}

		if (entry.block%1000 == 0) console.log(`block ${entry.block}: `)
		
    	for (let i = 0; i < entry.tx_hash.length; i++) {
    		try {
				const tx = await mvs.getTransaction(entry.tx_hash[i])
				if (tx == null) {
					console.log(`tx miss: ${entry.tx_hash[i]}`);
					miss_txs.push(entry);
				} else if (tx.transactionIndex != i) {
					console.log(`tx order err: ${entry.tx_hash[i]}`);
					miss_txs.push(entry);
				}
			} catch (e) {
				console.log(e);
				miss_txs.push(entry);
			}
    	}
    	
    }

	// pretty-print JSON object to string
	const data = JSON.stringify(miss_txs, null, 4);
	try {
	    fs.writeFileSync(MISS_TX_PATH, data);
	    console.log("miss_tx is saved.");
	} catch (err) {
	    console.error(err);
	}

}


main().catch(console.error).finally(() => process.exit());

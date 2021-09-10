const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const ERR_TX_PATH = path.join(__dirname, './', 'err_tx.json');
const UNEXPECTED_TX_PATH = path.join(__dirname, './', 'unexpected_tx.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:19933'

var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var mvs = web3.eth;

var unexpected_err_txs = [];

async function main () {

	let err_txs;
	if (!fs.existsSync(ERR_TX_PATH)) {
		console.log('err_tx data missing.');
		return;
	} else {
		err_txs = JSON.parse(fs.readFileSync(ERR_TX_PATH, 'utf8'));
	}

    for (const entry of err_txs) {
    	try {
			const tx = await mvs.getTransactionReceipt(entry.tx_hash)
			if (tx.status != false) {
				console.log(`block: ${entry.block}`)
				console.log(`tx: ${entry.tx_hash}`)
				console.log('--------------')
				unexpected_err_txs.push(entry);
			}
		} catch (e) {
			console.log(e);
		}
    }

	// pretty-print JSON object to string
	const data = JSON.stringify(unexpected_err_txs, null, 4);
	try {
	    fs.writeFileSync(UNEXPECTED_TX_PATH, data);
	    console.log("unexpected_tx is saved.");
	} catch (err) {
	    console.error(err);
	}

}


main().catch(console.error).finally(() => process.exit());

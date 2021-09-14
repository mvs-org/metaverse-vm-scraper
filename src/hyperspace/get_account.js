const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise, WsProvider } = require('@polkadot/api');

const SCHEMA_PATH = path.join(__dirname, '../', 'schema.json');
const ACCOUNT_STORAGE_PATH = path.join(__dirname, './', 'account_storage.json');
const BLOCK_HASH = process.env.BLOCK_HASH || "latest"
const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:19944'

const wsProvider = new WsProvider(WS_URL);

let prefixes = ['0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */];
var storage = [];

async function main () {
	// Create the API and wait until ready
	let hapi;
	if (!fs.existsSync(SCHEMA_PATH)) {
		console.log('Custom Schema missing, using default schema.');
		hapi = await ApiPromise.create({ wsProvider });
	} else {
		const { types, rpc } = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
		hapi = await ApiPromise.create({
		  wsProvider,
		  types,
		  rpc,
		});
	}

	let pairs;
	if (BLOCK_HASH == "latest") {
		pairs = await wsProvider.send('state_getPairs', [prefixes[0]]);
	} else {
		pairs = await wsProvider.send('state_getPairs', [prefixes[0], BLOCK_HASH]);
	}
    // if (pairs.length > 0) {
    //   stream.write(JSON.stringify(pairs).slice(1, -1));
    //   console.log(pairs);
    // }

    console.log(pairs);
    storage = pairs;
    const data = JSON.stringify(storage, null, 4);
	try {
	    fs.writeFileSync(ACCOUNT_STORAGE_PATH, data);
	    console.log("Storage is saved.");
	} catch (err) {
	    console.error(err);
	}
	
}


main().catch(console.error).finally(() => process.exit());

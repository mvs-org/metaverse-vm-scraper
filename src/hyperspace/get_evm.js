const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise, WsProvider } = require('@polkadot/api');

const SCHEMA_PATH = path.join(__dirname, '../', 'schema.json');
const EVM_STORAGE_PATH = path.join(__dirname, './', 'evm_storage.json');
const BLOCK_HASH = process.env.BLOCK_HASH || "latest"
const WS_URL = process.env.WS_URL || 'ws://localhost:19944'

const wsProvider = new WsProvider(WS_URL);

let prefixes = ['0x481e85de82e1da150ff69a0ce05ce20d' /* HyperspaceEVM */];
//let prefixes = ['0x1da53b775b270400e7e61ed5cbc5a146' /* EVM */];
var evm_storage = [];

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
    evm_storage = pairs;
    const data = JSON.stringify(evm_storage, null, 4);
	try {
	    fs.writeFileSync(EVM_STORAGE_PATH, data);
	    console.log("EVM storage is saved.");
	} catch (err) {
	    console.error(err);
	}
	
}


main().catch(console.error).finally(() => process.exit());

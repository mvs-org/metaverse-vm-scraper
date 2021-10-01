const fs = require('fs');
const path = require('path');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const axios = require('axios');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : 10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const provider = new HttpProvider(NEW_URL);

async function main () {
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

	// let ret = await api.rpc.engine.createBlock(true, false)
	// console.log(`hash: ${ret.hash}`)

	const create_block = {
		jsonrpc:"2.0",
		id:1,
		method:"engine_createBlock",
		params: [true, false, 1615323971000, null]
	}
	await axios.post(NEW_URL, create_block)
		.then(res => {
			console.log(`statusCode: ${res.status}`)
		})
		.catch(console.log);
}

main().catch(console.error).finally(() => process.exit());

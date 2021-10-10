const fs = require('fs');
const path = require('path');
const execFileSync = require('child_process').execFileSync;
const execSync = require('child_process').execSync;
const Web3 = require('web3');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const { xxhashAsHex, blake2AsHex } = require('@polkadot/util-crypto');
const { decodeAddress, encodeAddress } = require('@polkadot/keyring');
const util = require("@polkadot/util");
const types = require("@polkadot/types")
const mapping = require("./hyperspace/address_mapping");

const BIN_PATH = path.join(__dirname, 'data', 'binary');
const ORIGINAL_SPEC_PATH = path.join(__dirname, 'data', 'genesis.json');
const FORKED_SPEC_PATH = path.join(__dirname, 'data', 'fork.json');
const WASM_PATH = path.join(__dirname, 'data', 'runtime.wasm');
const SCHEMA_PATH = path.join(__dirname, 'data', 'schema.json');
const HEX_PATH = path.join(__dirname, 'data', 'runtime.hex');
const BLOCK_NR = process.env.BLOCK_NR ? parseInt(process.env.BLOCK_NR, 10) : "latest"
const IS_PARITY = process.env.IS_PARITY || false
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:9944'

const registry = new types.TypeRegistry();
const wsProvider = new WsProvider(WS_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var utils = web3.utils;
var mvs = web3.eth;

let prefixes = [
	'0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9', /* System.Account */
	'0x481e85de82e1da150ff69a0ce05ce20d', /* HyperspaceEVM */
	'0x1da53b775b270400e7e61ed5cbc5a146' /* EVM */
	];

function init_codec () {
	let hAccountDataType = {"HAccountData": {
		"free": "Balance",
		"reserved": "Balance",
		"free_dna": "Balance",
		"reserved_dna": "Balance"
	}}
	let hAcountInfoType = {"HAccountInfo": {
		"nonce": "Index",
		"consumers": "RefCount",
		"providers": "RefCount",
		"data": "HAccountData",
	}}
	let nfAccountDataType = {"NFAccountData": {
		"free": "Balance",
		"reserved": "Balance",
		"misc_frozen": "Balance",
		"fee_frozen": "Balance"
	}}
	let nfAcountInfoType = {"NFAccountInfo": {
		"nonce": "Index",
		"consumers": "RefCount",
		"providers": "RefCount",
		"data": "NFAccountData",
	}}

	registry.register(hAccountDataType);
	registry.register(hAcountInfoType);
	registry.register(nfAccountDataType);
	registry.register(nfAcountInfoType);
}

// get account storage from Hyperspace and convert codec data to new-frontiers
async function get_account (forkedSpec, blockHash, blockNr) {
	const account_prefix = prefixes[0]; /* System.Account */
	let pairs = await wsProvider.send('state_getPairs', [account_prefix, blockHash]);

	for (let entry of pairs) {
		let key = entry[0];
		let rawVal = entry[1];

		if (key.indexOf(account_prefix) >= 0 && key.length == 162) {
			var hdata = "0x" + key.substring(98) //get sub_addr scale data
			var sub_addr = encodeAddress(hdata)
			//console.log(`sub_addr = ${sub_addr}`)
			
			if (mapping.haveValidEvm(sub_addr)) {
				var evm_addr = mapping.subToEvm(sub_addr)

				let val = await mvs.getBalance(
			 		evm_addr,
					blockNr,
				);
				var fData = {
					"free": val,
					"reserved": 0,
					"misc_frozen": 0,
					"fee_frozen": 0
				}

				// Decode Hyperspace AccountInfo
				var obj = types.createType(registry, "HAccountInfo", rawVal).toJSON()
				//:NOTICE: replace balance with value from web3, because the balance in Hyperspace AccountInfo isn't complete
				obj.data = fData

				var dataObj
				if (IS_PARITY) {
					obj.sufficients = 0
					dataObj = types.createType(registry, "AccountInfo", obj)
				} else {
					dataObj = types.createType(registry, "NFAccountInfo", obj)
				}

				console.log(`${evm_addr}: `, JSON.stringify(dataObj))
				forkedSpec.genesis.raw.top[key] = dataObj.toHex()
			}
		}
	}

}

// get EVM storage from Hyperspace and convert codec data to new-frontiers
async function get_evm (forkedSpec, blockHash) {
	const hevm_prefix = prefixes[1] /* HyperspaceEVM */
	const evm_prefix = prefixes[2] /* EVM */
	let pairs = await wsProvider.send('state_getPairs', [hevm_prefix, blockHash]);

	for (let entry of pairs) {
		let key = entry[0];
		let rawVal = entry[1];

		key = key.replace(hevm_prefix, evm_prefix);
		forkedSpec.genesis.raw.top[key] = rawVal;
	}
}

async function main () {

	if (!fs.existsSync(BIN_PATH)) {
		console.log('Binary missing. Please copy the binary of new-frontiers node to the data folder and rename the binary to "binary"');
		process.exit(1);
	}
	execFileSync('chmod', ['+x', BIN_PATH]);

	if (!fs.existsSync(WASM_PATH)) {
		console.log('WASM missing. Please copy the WASM blob of new-frontiers node to the data folder and rename it to "runtime.wasm"');
		process.exit(1);
	}
	execSync('cat ' + WASM_PATH + ' | hexdump -ve \'/1 "%02x"\' > ' + HEX_PATH);

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

	// Generate chain spec for original and forked chains
	execSync(BIN_PATH + ' build-spec --raw > ' + ORIGINAL_SPEC_PATH);
	execSync(BIN_PATH + ' build-spec --disable-default-bootnode --raw > ' + FORKED_SPEC_PATH);

	let originalSpec = JSON.parse(fs.readFileSync(ORIGINAL_SPEC_PATH, 'utf8'));
	let forkedSpec = JSON.parse(fs.readFileSync(FORKED_SPEC_PATH, 'utf8'));

	// Modify chain name and id
	forkedSpec.name = originalSpec.name + '-fork';
	forkedSpec.id = originalSpec.id + '-fork';
	forkedSpec.protocolId = originalSpec.protocolId;
	// Set the code to the current runtime code
	forkedSpec.genesis.raw.top['0x3a636f6465'] = '0x' + fs.readFileSync(HEX_PATH, 'utf8').trim();

	init_codec();

	let blockHash;
	if (BLOCK_NR == "latest") {
		blockHash = await hapi.rpc.chain.getBlockHash();
	} else {
		blockHash = await hapi.rpc.chain.getBlockHash(BLOCK_NR);
	}
	//console.log("block_hash: ", blockHash.toString())
	console.log("Get account storage:")
	await get_account(forkedSpec, blockHash.toString(), BLOCK_NR);
	console.log("Done")
	console.log("Get evm storage:")
	await get_evm(forkedSpec, blockHash.toString());
	console.log("Done")

	fs.writeFileSync(FORKED_SPEC_PATH, JSON.stringify(forkedSpec, null, 4));

	console.log('Forked genesis generated successfully. Find it at ./data/fork.json');
	process.exit();
}


main().catch(console.error).finally(() => process.exit());

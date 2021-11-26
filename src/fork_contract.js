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

const ORIGINAL_SPEC_PATH = path.join(__dirname, 'data', 'nf-testnet.json');
const FORKED_SPEC_PATH = path.join(__dirname, 'data', 'nf-testnet-out.json');
const SCHEMA_PATH = path.join(__dirname, 'data', 'schema.json');
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

let contracts = [
	'0x623761F60D677addBD5A07385e037105A13201EF', // USDT
	'0xD2aEE12b53895ff8ab99F1B7f73877983729888f', // GENE
	'0xC35F4BFA9eA8946a3740AdfEb4445396834aDF62', // DNA
	'0x757938BBD9a3108Ab1f29628C15d9c8715d2F481', // WETP
	'0x35a0ef692749296249ea12B8F86a28503b8e5433', // STICKERS
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
				// set account nonce to 0
				obj.nonce = 0

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
	const contract_prefixes = get_evm_contract_prefixs(contracts)
	let pairs = await wsProvider.send('state_getPairs', [hevm_prefix, blockHash]);

	for (let entry of pairs) {
		let key = entry[0];
		let rawVal = entry[1];

		// filter match contracts
		for (let prefix of contract_prefixes) {
			if (key.indexOf(prefix) >= 0) {
				key = key.replace(hevm_prefix, evm_prefix);
				forkedSpec.genesis.raw.top[key] = rawVal;
			}
		}
	}
}

function b2_128concat (hex) {
	return blake2AsHex(hex, 128)+hex.substring(2)
}

function get_evm_contract_prefixs (contracts) {
	// HyperspaceEVM.AccountCodes
	evmAccountCodesPrefix = "0x481e85de82e1da150ff69a0ce05ce20dea70f53d5a3306ce02aaf97049cf181a"
	// HyperspaceEVM.AccountStorages
	evmAccountStoragesPrefix = "0x481e85de82e1da150ff69a0ce05ce20dab1160471b1418779239ba8e2b847e42"
	
	let prefixes = []
	for (let contract of contracts) {
		contract = contract.toLowerCase()
		let b2 = b2_128concat(contract)
		prefixes.push(evmAccountCodesPrefix + b2.substring(2))
		prefixes.push(evmAccountStoragesPrefix + b2.substring(2))
	}

	//console.log('prefixes: ', prefixes)
	return prefixes
}

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

	init_codec();
	let forkedSpec = JSON.parse(fs.readFileSync(ORIGINAL_SPEC_PATH, 'utf8'));

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

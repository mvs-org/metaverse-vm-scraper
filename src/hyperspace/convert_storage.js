const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const { xxhashAsHex, blake2AsHex } = require('@polkadot/util-crypto');
const { decodeAddress, encodeAddress } = require('@polkadot/keyring');
const util = require("@polkadot/util");
const types = require("@polkadot/types")
const mapping = require("./address_mapping");

const ACCOUNT_STORAGE_PATH = path.join(__dirname, './', 'account_storage.json');
const ACCOUNT_DATA_PATH = path.join(__dirname, './', 'account.json');
const EVM_STORAGE_PATH = path.join(__dirname, './', 'evm_storage.json');
const ACCOUNT_SPEC_PATH = path.join(__dirname, './', 'account_spec.json');
const EVM_SPEC_PATH = path.join(__dirname, './', 'evm_spec.json');
const BLOCK_NR = process.env.BLOCK_NR ? parseInt(process.env.BLOCK_NR, 10) : "latest"
const IS_PARITY = process.env.IS_PARITY || false
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:19933'

const registry = new types.TypeRegistry();
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var utils = web3.utils;
var mvs = web3.eth;


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

// convert codec from Hyperspace to new-frontiers
async function convert_account () {
	const account_prefix = '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */
	let accounts = {};
	let accountStorages = JSON.parse(fs.readFileSync(ACCOUNT_STORAGE_PATH, 'utf8'));

	for (let entry of accountStorages) {
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
					BLOCK_NR,
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
				accounts[key] = dataObj.toHex()
			}
		}
	}

	const data = JSON.stringify(accounts, null, 4);
	try {
	    fs.writeFileSync(ACCOUNT_SPEC_PATH, data);
	    console.log("account_spec is saved.");
	} catch (err) {
	    console.error(err);
	}
}

// convert codec from Hyperspace to new-frontiers
async function convert_evm () {
	const hevm_prefix = '0x481e85de82e1da150ff69a0ce05ce20d' /* HyperspaceEVM */
	const evm_prefix = '0x1da53b775b270400e7e61ed5cbc5a146' /* EVM */
	let evms = {};
	let evmStorages = JSON.parse(fs.readFileSync(EVM_STORAGE_PATH, 'utf8'));

	for (let entry of evmStorages) {
		let key = entry[0];
		let rawVal = entry[1];

		key = key.replace(hevm_prefix, evm_prefix);
		evms[key] = rawVal
	}

	const data = JSON.stringify(evms, null, 4);
	try {
	    fs.writeFileSync(EVM_SPEC_PATH, data);
	    console.log("evm_spec is saved.");
	} catch (err) {
	    console.error(err);
	}
}

async function main () {

	init_codec();

	await convert_account();
	
	await convert_evm();


}


main().catch(console.error).finally(() => process.exit());

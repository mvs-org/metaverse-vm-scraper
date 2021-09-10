const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const { xxhashAsHex, blake2AsHex } = require('@polkadot/util-crypto');
const { decodeAddress, encodeAddress } = require('@polkadot/keyring');
const util = require("@polkadot/util");
const mapping = require("./address_mapping");

const SPEC_PATH = path.join(__dirname, './', 'fork.json');
const STORAGE_PATH = path.join(__dirname, './', 'storage.json');
const STATE_DATA_PATH = path.join(__dirname, './', 'state.json');
const BLOCK_NR = process.env.BLOCK_NR ? parseInt(process.env.BLOCK_NR, 10) : "latest"
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'

var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var utils = web3.utils;
var mvs = web3.eth;

let account_prefix = '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */
var state_storages = [];

async function main () {

	// let forkedSpec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
	// let top = forkedSpec.genesis.raw.top

	let storage = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));

	for (let entry of storage) {
		let key = entry[0];
		//console.log(`key: ${key}`)
		
		// match account entry with System.Account prefix
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

				if (val > 0) {
					var account = {
						evm_addr: evm_addr,
						sub_addr: sub_addr,
						balance: val,
					}

					state_storages.push(account)
					console.log(`${evm_addr} = ${sub_addr}, val=${val.padStart(24, " ")}`)
				}
			}

		}
		
	}
	
	const data = JSON.stringify(state_storages, null, 4);
	try {
	    fs.writeFileSync(STATE_DATA_PATH, data);
	    console.log("state is saved.");
	} catch (err) {
	    console.error(err);
	}


}


main().catch(console.error).finally(() => process.exit());

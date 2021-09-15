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
const BLOCK_NR = process.env.BLOCK_NR ? parseInt(process.env.BLOCK_NR, 10) : "latest"
const IS_PARITY = process.env.IS_PARITY || true
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:19933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9933'


var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
var utils = web3.utils;
var mvs = web3.eth;
var frontier = new_web3.eth;


// convert codec from Hyperspace to new-frontiers
async function compare_account () {
	const account_prefix = '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */
	let accounts = {};
	let accountStorages = JSON.parse(fs.readFileSync(ACCOUNT_STORAGE_PATH, 'utf8'));

	console.log("Start comparing account:");
	for (let entry of accountStorages) {
		let key = entry[0];
		let rawVal = entry[1];

		if (key.indexOf(account_prefix) >= 0 && key.length == 162) {
			var hdata = "0x" + key.substring(98) //get sub_addr scale data
			var sub_addr = encodeAddress(hdata)
			//console.log(`sub_addr = ${sub_addr}`)
			
			if (mapping.haveValidEvm(sub_addr)) {
				var evm_addr = mapping.subToEvm(sub_addr)

				let balanceH = await mvs.getBalance(
					evm_addr,
					BLOCK_NR,
				);
				let balanceF = await frontier.getBalance(
					evm_addr,
					BLOCK_NR,
				);

				if (balanceH != balanceF) {
					console.log(`block ${BLOCK_NR}, ${evm_addr}: ${balanceH}, ${balanceF}`);
				} else {
					//console.log(`block ${BLOCK_NR}, ${evm_addr}: ${balanceH}, ${balanceF}`);
				}
			}
		}
	}


}

// convert codec from Hyperspace to new-frontiers
async function compare_evm () {
	const evm_prefix = '0x481e85de82e1da150ff69a0ce05ce20dea70f53d5a3306ce02aaf97049cf181a' /* HyperspaceEVM.AccountCodes */
	let evms = {};
	let evmStorages = JSON.parse(fs.readFileSync(EVM_STORAGE_PATH, 'utf8'));

	console.log("Start comparing EVM storage:");
	for (let entry of evmStorages) {
		let key = entry[0];
		let rawVal = entry[1];

		if (key.indexOf(evm_prefix) >= 0 && key.length == 138) {
			var evm_addr = "0x" + key.substring(98) //get contract address

			for (let i=0; i<64; i++) {
				let resH = await mvs.getStorageAt(
					evm_addr,
					utils.toHex(i),
					BLOCK_NR
				);
				let resF = await frontier.getStorageAt(
					evm_addr,
					utils.toHex(i),
					BLOCK_NR
				);

				
				if (resH != resF) {
					console.log(`${evm_addr}: idx ${i}: ${resH}, ${resF}`)
				} else {
					//console.log(`${evm_addr}: idx ${i}: ${resH}, ${resF}`)
				}
			}
			console.log('--------------')
		}
	}

}

async function main () {

	await compare_account();
	
	await compare_evm();


}


main().catch(console.error).finally(() => process.exit());

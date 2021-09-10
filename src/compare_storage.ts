const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { ApiPromise } = require('@polkadot/api');
const { HttpProvider } = require('@polkadot/rpc-provider');
const axios = require('axios');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : START_BLOCK+5
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:19933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9933'

const hprovider = new HttpProvider(RPC_URL);
const provider = new HttpProvider(NEW_URL);
var web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
var new_web3 = new Web3(new Web3.providers.HttpProvider(NEW_URL));
var utils = web3.utils;
var mvs = web3.eth;
var frontier = new_web3.eth;

contracts = [
"0x8B53DD6Be31372C1B2A48e7d4ADD811328eB3F01",
"0x7f79f090a60b3653F7d910E4B5279cF1d8168aD1",
"0x7E3E77275e8d728BEdF67495fB2309655B07bCf6",
"0x64c1E5Ed2504fF8bf3654a530A7F9591690a06c7",
"0x215090Fb6daCf9125D517Df2c4b9C775B214420e",
"0xB177EA5840A4F062039C967406fB8590D10AF512",
"0x8865ea7103eB860d7957ef0121425311F38d2905",
"0x6830387fC6f3c74873507a5774235fFd0C0Eb012",
"0xa67c5AA07346E50C0762745e309C956ec9248Fd8",
"0xcC8417731D5d1CE398c9351CBcDA1E96fC6e77Ab",
"0x04E940F59c2f664A112A42945d63dD8baBa1e80C",
"0x90dA80D466c5085FA17A28A97219FF942a8B60C9",
"0x55d4f90b267dB4EfAFe814E38C8078007985b0D6",
"0xBcaC9f6502BEf1D511B080D9655C221E20656fE0",
"0xA89e70AA20892273530B4FB334e4822310699453",
"0xB4330CEAE3210019426A753F170F0d255eeAcd3C",
"0x6DBeCddFCCea6fbeeC2617bDf4a5820Ac0542Ad0",
"0x1C6350226F1455283E231C07212f2eE8F6c76B00",
"0xd4EeC9185c9f7a6d2aDf802b60D7336Daef97E94",
"0x31C42C52326996d223F1B67EDbA1a40d5445E12d",
"0xB5281f48cc478db77d30811f54201C771028956a",
"0xdd7b721d75B4008B42b1A0a42fD6eBDC02C6c013",
"0x0E5BB45D4146Fb908F4bDb5F35d748553538a992",
"0x1657A8D43AA5fE2726e7E9454De97ccD5c79b589",
"0xF56f08E31d5C18cfAE3a81d3BA73fbAaD4F2C830",
"0x1e2115EdC6175412F4D8957d83696d514A7E2910",
"0x1221843116bc99dE39761f0745D37A4DdC2CC939",

"0x51866AC12965cdc30CF0640615E445253Ce8616D",
"0x757938BBD9a3108Ab1f29628C15d9c8715d2F481",
"0xbD52FCD80dc96b6C908a19970FF727E88EdA5Ba7",
"0x14d8CE560E42A670Fb1E56baf44b173c9f81496f"
];

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main () {
	
	for (const contract of contracts) {
		console.log(`contract ${contract}: `)
		console.log(`hyperspace									new-frontiers`)
		for (let i=0; i<64; i++) {
			let resH = await mvs.getStorageAt(
				contract,
				utils.toHex(i),
				29427
			);
			let resF = await frontier.getStorageAt(
				contract,
				utils.toHex(i),
				29427
			);

			if (resH != resF) console.log(`idx ${i}: ${resH}, ${resF}`) 
			
			

		}
		console.log('--------------')
	}

	await sleep(5000);
}


main().catch(console.error).finally(() => process.exit());

// To run with node.js, first: $ yarn add $polkadot/api
// then add commented lines:

const { xxhashAsHex, blake2AsHex } = require('@polkadot/util-crypto');
const { decodeAddress, encodeAddress } = require('@polkadot/keyring');
const util = require("@polkadot/util");
//const { u8aToHex } = require("@polkadot/util");

function evmToSub (evm_addr) {
	if (!(evm_addr.substring(0, 2) == "0x") || evm_addr.length != 42) {
		console.log("Invalid 0x address!")
		return
	}

	var u8a = util.hexToU8a(evm_addr)
	var prefix = new TextEncoder("utf-8").encode("dvm:\0\0\0\0\0\0\0");
	//var str = new TextDecoder("utf-8").decode(u8a);
	
	var udata = util.u8aConcat(prefix, u8a)
	var checksum = new TextEncoder("utf-8").encode("\0");
	for (let i=0; i<31; i++) {
		checksum[0] ^= udata[i]
	}

	var udata = util.u8aConcat(udata, checksum)
	var sub_addr = encodeAddress(util.u8aToHex(udata))

	return sub_addr
}

function subToEvm (sub_addr) {
	if (sub_addr.length != 48) {
		console.log("Invalid substrate address!")
		return
	}

	if (!haveValidEvm(sub_addr)) {
		return
	}
	
	var udata = decodeAddress(sub_addr)
	var evm_addr = util.u8aToHex(udata.slice(11, 31))
	return evm_addr
}

function haveValidEvm (sub_addr) {
	if (sub_addr.length != 48) {
		console.log("Invalid substrate address!")
		return false
	}

	var udata = decodeAddress(sub_addr)
	var checksum = new TextEncoder("utf-8").encode("\0");
	for (let i=0; i<31; i++) {
		checksum[0] ^= udata[i]
	}

	if (checksum[0] != udata[31]) {
		//console.log(`Checksum error: ${checksum[0]}, ${udata[31]}`)
		return false
	}
	
	return true
}

module.exports.haveValidEvm = haveValidEvm
module.exports.subToEvm = subToEvm
module.exports.evmToSub = evmToSub


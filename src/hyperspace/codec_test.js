
let types = require("@polkadot/types")

async function scale_codec_test () {

	const registry = new types.TypeRegistry();

	console.log("Frontiers: ")
	var dataBytes = "0x00000000000000000100000000000000000064a7b3b6e00d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
	console.log(dataBytes)

	let typesObject = {"MyA": "AccountInfo"}
	registry.register(typesObject);
    dataObj = types.createType(registry, "MyA", dataBytes)
    console.log(JSON.stringify(dataObj))
    console.log(dataObj.toHex())
    console.log("-----------------------")

    console.log("Hyperspace: ")
    let hAccountDataType = {"HAccountData": {
		"free": "u128",
		"reserved": "u128",
		"free_dna": "u128",
		"reserved_dna": "u128"
	}}
	let hAcountInfoType = {"HAccountInfo": {
		"nonce": "Index",
		"consumers": "RefCount",
		"providers": "RefCount",
		"data": "HAccountData",
	}}

	var dataBytes = "0x00000000000000000100000008886203000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
	console.log(dataBytes)
	registry.register(hAccountDataType);
	registry.register(hAcountInfoType);
	dataObj = types.createType(registry, "HAccountInfo", dataBytes)
	console.log(JSON.stringify(dataObj))
    console.log(dataObj.toHex())
    console.log("-----------------------")

    console.log("New-frontiers: ")
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

	var dataBytes = "0x000000000000000001000000000064a7b3b6e00d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
	console.log(dataBytes)
	registry.register(nfAccountDataType);
	registry.register(nfAcountInfoType);
	dataObj = types.createType(registry, "NFAccountInfo", dataBytes)
	console.log(JSON.stringify(dataObj))
    console.log(dataObj.toHex())
    console.log("-----------------------")

}

async function main () {
	scale_codec_test()
}

main().catch(console.error).finally(() => process.exit());

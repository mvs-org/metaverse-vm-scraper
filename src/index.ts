import { providers } from 'ethers'

(async () => {
	let blockNumber = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
	const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
	const mvs = new providers.JsonRpcProvider(RPC_URL)
	while(true){
		const block = await mvs.getBlock(blockNumber)
		console.log(`block ${block.number}: ${block.hash}`)
		let index = 0
		for (const txid of block.transactions) {
			const tx = await mvs.getTransaction(txid)
			console.log(`tx ${index}: ${tx.hash}`)
			console.log(tx.raw)
			index++
		}
		console.log('--------------')
		blockNumber++
	}
})()

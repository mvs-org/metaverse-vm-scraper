const fs = require('fs');
const path = require('path');
const {ApiPromise} = require('@polkadot/api');
const {HttpProvider} = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const START_BLOCK = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK, 10) : 0
const END_BLOCK = process.env.END_BLOCK ? parseInt(process.env.END_BLOCK, 10) : 10
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'
const NEW_URL = process.env.NEW_URL || 'http://127.0.0.1:9934'

const provider = new HttpProvider(NEW_URL);

async function main() {
    let api;
    if (!fs.existsSync(SCHEMA_PATH)) {
        console.log('Custom Schema missing, using default schema.');
        api = await ApiPromise.create({provider});
    } else {
        const {types, rpc} = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
        api = await ApiPromise.create({
            provider,
            types,
            rpc,
        });
    }
    for (let i = START_BLOCK; i <= END_BLOCK; i++) {
        const blockHash = await api.rpc.chain.getBlockHash(i);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);
        signedBlock.block.extrinsics.forEach((ex, index) => {
            console.log(`block:${i} extrinsic_index:${index} info:`, ex.toHuman())
            // const {isSigned, meta, method: {args, method, section}} = ex;
        });
    }

}

main().catch(console.error).finally(() => process.exit());

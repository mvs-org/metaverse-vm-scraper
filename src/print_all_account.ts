const fs = require('fs');
const path = require('path');
const {ApiPromise} = require('@polkadot/api');
const {HttpProvider} = require('@polkadot/rpc-provider');

const SCHEMA_PATH = path.join(__dirname, './', 'schema.json');
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:9933'

const provider = new HttpProvider(RPC_URL);

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
    let users =  await api.query.system.account.entries();
    users.forEach(([hash, value]) => {
        console.log("accountId:",hash.toHex().slice(-32))
        console.log(hash.toHex(), value.toHuman());
    })
}

main().catch(console.error).finally(() => process.exit());

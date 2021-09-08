const fs = require('fs');
const path = require('path');
const {xxhashAsHex} = require('@polkadot/util-crypto');
const ORIGINAL_SPEC_PATH = path.join(__dirname, './', 'genesis.json');

async function main() {
    if (!fs.existsSync(ORIGINAL_SPEC_PATH)) {
        console.log('genesis missing. Please copy the genesis.json of your substrate node to the current folder and rename the binary to "genesis.json"');
        process.exit(1);
    }
    let originalSpec = JSON.parse(fs.readFileSync(ORIGINAL_SPEC_PATH, 'utf8'));
    const systemAccountHash = xxhashAsHex("System", 128) + (xxhashAsHex("Account", 128).replace("0x", ""))
    let systemAccount = Object.entries(originalSpec.genesis.raw.top).filter((i) => i[0].startsWith(systemAccountHash))
    systemAccount.forEach((i) => {
        let a = {
            AccountId: i[0].slice(-32),
            Key: i[0],
            Value: i[1],
        }
        console.log(a)
    })
    console.log("total:", Object.entries(systemAccount).length)
}

main().catch(console.error).finally(() => process.exit());

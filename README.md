# State migration

This script allows bootstrapping a `New-frontiers` chain with the snapshot state of `Hyperspace` chain. Basically it's a state storage migration from `Hyperspace`.

**State storage:**

- EVM account balance
- EVM contract storage

## Usage

1. Clone this repository and install dependencies

    ```bash
    git clone https://github.com/mvs-org/metaverse-vm-scraper.git
    cd metaverse-vm-scraper
    npm i
    ```

3. Copy the executable/binary of the `New-frontiers` node inside the `src/data` folder and rename it to `binary`.

4. Copy the runtime WASM blob of the `New-frontiers` runtime to the `src/data` folder and rename it to `runtime.wasm`. To get the WASM blob, compile `New-frontiers` and look for `./target/release/wbuild/runtime/runtime.compact.wasm`. 

5. Copy the additional `Hyperspace` types to the `src/data` folder and rename it to `schema.json`.

6. Either run a full `Hyperspace` node locally(Recommended) or have an external endpoint handy.

7. Run the script
    * If using a local node, simply run the script using (`BLOCK_NR` is for block height, default is "latest")

        ```bash
        BLOCK_NR=500000 node src/fork.js
        ```

    * If you are using an external/non-default endpoint, you need to provide it to the script via the `HTTP_RPC_ENDPOINT` environment variable

        ```bash
        BLOCK_NR=500000 RPC_URL=http://example.com WS_URL=ws://example.com node src/fork.js
        ```

8. You should have the genesis file for the forked chain inside the `data` folder. It will be called `fork.json`.

9. You can now run a `New-frontiers` chain using this genesis file

    ```bash
    ./binary --chain fork.json --alice
    ```


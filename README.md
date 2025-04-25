#### Install the required packages

```
npm install
```

#### Compile the contracts

```
npx hardhat compile
```

#### Run local test script (test results are saved under scripts/testResults directories)

```
npx hardhat run scripts/test_local.js
```

#### For UI test, first, start the local hardhat node (local ethereum network on localhost)

```
npx hardhat node
```

#### Deploy the diamond contracts and initialize accounts on the local network

```
npx hardhat run draft.js --network localhost
```

#### Create/Save account info for using during UI tests on the browser

```
npx hardhat run write_test_info.js --network localhost
```

<br>

## For the webserver and frontend files, start a separate terminal in "frontend/" directory

#### Run webpack config for bundling multiple js files to run on browser

```
npx webpack --config webpack.config.js
```

#### Start the node express server

```
node server.js
```

#### Go to "http://localhost:3000" for interacting with diamond lottery contract using web UI

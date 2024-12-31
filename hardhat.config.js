require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // defaultNetwork: "hardhat",
    hardhat: {
      // url: "http://127.0.0.1:8545",
      accounts: {
        count: 11, // Number of accounts to generate
      },
      allowBlocksWithSameTimestamp: true,
    },
    // sepolia: {
    //   url: "https://sepolia.infura.io/v3/<key>",
    //   accounts: [privateKey1, privateKey2]
    // }
  },
  paths: {
    sources: "./contracts", // Ensure this points to your contracts folder
  },
};

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
    hardhat: {
      accounts: {
        count: 401, // Number of accounts to generate
      },
      allowBlocksWithSameTimestamp: true,
    },
  },
  paths: {
    sources: "./contracts", // Ensure this points to your contracts folder
  },
};

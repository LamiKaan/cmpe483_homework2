require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        process.env.HARDHAT_PRIVATE_KEY1,
        process.env.HARDHAT_PRIVATE_KEY2,
        process.env.HARDHAT_PRIVATE_KEY3,
        process.env.HARDHAT_PRIVATE_KEY4,
        process.env.HARDHAT_PRIVATE_KEY5,
        process.env.HARDHAT_PRIVATE_KEY6,
        process.env.HARDHAT_PRIVATE_KEY7,
        process.env.HARDHAT_PRIVATE_KEY8,
        process.env.HARDHAT_PRIVATE_KEY9,
        process.env.HARDHAT_PRIVATE_KEY10,
        process.env.HARDHAT_PRIVATE_KEY11,
        process.env.METAMASK_PRIVATE_KEY1,
        process.env.METAMASK_PRIVATE_KEY2,
        process.env.METAMASK_PRIVATE_KEY3,
        process.env.METAMASK_PRIVATE_KEY4,
        process.env.METAMASK_PRIVATE_KEY5,
        process.env.METAMASK_PRIVATE_KEY6,
      ],
      chainId: 1337,
      mining: {
        auto: true,
        interval: 5000,
      }
    }
    // sepolia: {
    //   url: "https://sepolia.infura.io/v3/<key>",
    //   accounts: [privateKey1, privateKey2]
    // }
  },
  paths: {
    sources: "./contracts", // Ensure this points to your contracts folder
  },
};

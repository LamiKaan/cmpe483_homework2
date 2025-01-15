const { ethers, network } = require("hardhat");
const testHelpers = require("./scripts/test_helpers.js");
const diamondHelpers = require("./scripts/diamond_helpers.js");
const { deployDiamond } = require("./scripts/deploy_local.js");
require("dotenv").config();

function getMetamaskAccounts() {

    // Get private keys
    const metamaskPrivateKeys = []
    for (let i = 1; i <= 6; i++) {
        metamaskPrivateKeys.push(process.env[`METAMASK_PRIVATE_KEY${i}`]);
    }

    // Create accounts from private keys on the current chain
    const provider = ethers.provider
    const metamaskSigners = []
    for (const privateKey of metamaskPrivateKeys) {
        const wallet = new ethers.Wallet(privateKey, provider);
        metamaskSigners.push(wallet);
    }

    return metamaskSigners;

}

async function transferEth(fromSigner, toSignersArray, amount) {
    // Transfer ETH
    for (const toSigner of toSignersArray) {
        const tx = await fromSigner.sendTransaction({
            to: await toSigner.getAddress(),
            value: ethers.parseEther(`${amount}`)
            // value: ethers.parseEther(amount.toString())
        });
        await tx.wait();
    }
}

async function printAddressesAndBalances(provider, ownerSigner, metamaskSigners) {

    console.log(`Total signer count: ${(await ethers.getSigners()).length}`);
    console.log();

    console.log("OWNER (METAMASK 1)");
    console.log(`Address: ${await ownerSigner.getAddress()} Balance: ${await provider.getBalance(await ownerSigner.getAddress())} `);
    console.log();

    console.log("METAMASK ACCOUNTS");
    for (let i = 0; i < metamaskSigners.length; i++) {
        console.log(`${i + 2} Address: ${await metamaskSigners[i].getAddress()} Balance: ${await provider.getBalance(await metamaskSigners[i].getAddress())} `);
    }
}

async function getBlockTimestamp(provider) {
    return (await provider.getBlock('latest')).timestamp;
}

async function getProviderAndSigners(provider = null) {
    if (provider === null || provider === undefined) {
        provider = ethers.provider;
    }

    const [ownerSigner, ...buyerSigners] = await ethers.getSigners();
    const hardhatSigners = buyerSigners.slice(0, 10);
    const metamaskSigners = buyerSigners.slice(10);

    return [provider, ownerSigner, hardhatSigners, metamaskSigners];
}


async function main() {

    // await network.provider.send("evm_setIntervalMining", [5000]);
    // await network.provider.send("evm_setAutomine", [true]);

    const [ownerSigner, ...buyerSigners] = await ethers.getSigners();

    const provider = ethers.provider;

    // Print addresses and balances
    await printAddressesAndBalances(provider, ownerSigner, buyerSigners);

    // // Deploy diamond
    // console.log();
    // const [owner, facetFactories, diamondAdress, lotteryTokenAddress] = await deployDiamond();

    // console.log();
    // console.log(`Owners match: ${await owner.signer.getAddress() === await ownerSigner.getAddress()}`);
    // console.log(owner.signer);
    // console.log(ownerSigner);

    // console.log();
    // console.log(`Block timestamp: ${await getBlockTimestamp(provider)}`);

    // Get ABIs and Bytecodes
    // const [abis, bytecodes] = await testHelpers.getAbisAndBytecodes();
    // console.log("\nABIs: ");
    // console.log(abis);
    // console.log("\nBytecodes: ");
    // console.log(bytecodes);






}


if (require.main === module) {
    // Hardhat recommends this pattern to be able to use async/await everywhere
    // and properly handle errors.
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    getMetamaskAccounts,
    transferEth,
    printAddressesAndBalances,
    getBlockTimestamp
}



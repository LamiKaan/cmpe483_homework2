const { ethers, network } = require("hardhat");
const fs = require("fs/promises");
const path = require("path");
const testInfoPath = path.join(__dirname, "test-info.txt");


async function writeHtmlHash() {
    const htmlContents = "Mock HTML contents";
    const htmlHash = ethers.keccak256(ethers.toUtf8Bytes(htmlContents));

    const testInfoFile = await fs.open(testInfoPath, "a");

    await testInfoFile.write(`HTML Hash: ${htmlHash}\n\n`);
    await testInfoFile.close();

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

async function writeRandomNumbers() {

    const [provider, ownerSigner, hardhatSigners, metamaskSigners] = await getProviderAndSigners();

    const testInfoFile = await fs.open(testInfoPath, "a");

    let signerAddress = await ownerSigner.getAddress();
    let randomNumber = ethers.toBigInt(ethers.randomBytes(32));
    let wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
    let randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, signerAddress]));

    testInfoFile.write("OWNER (HARDHAT 0)\n");
    testInfoFile.write(`Address: ${await ownerSigner.getAddress()}\nRandom Number: ${randomNumber}\nWrong Random Number: ${wrongRandomNumber}\nRandom Number Hash: ${randomNumberHash}\n\n`);

    testInfoFile.write("HARDHAT ACCOUNTS\n");
    for (let i = 0; i < hardhatSigners.length; i++) {
        signerAddress = await hardhatSigners[i].getAddress();
        randomNumber = ethers.toBigInt(ethers.randomBytes(32));
        wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
        randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, signerAddress]));

        testInfoFile.write(`${i + 1}\n Address: ${signerAddress}\nRandom Number: ${randomNumber}\nWrong Random Number: ${wrongRandomNumber}\nRandom Number Hash: ${randomNumberHash}\n\n`);
    }

    testInfoFile.write("METAMASK ACCOUNTS\n");
    for (let i = 0; i < metamaskSigners.length; i++) {
        signerAddress = await metamaskSigners[i].getAddress();
        randomNumber = ethers.toBigInt(ethers.randomBytes(32));
        wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
        randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, signerAddress]));

        testInfoFile.write(`${i + 1}\n Address: ${signerAddress}\nRandom Number: ${randomNumber}\nWrong Random Number: ${wrongRandomNumber}\nRandom Number Hash: ${randomNumberHash}\n\n`);
    }

    await testInfoFile.close();
}


async function main() {

    await writeHtmlHash();

    await writeRandomNumbers();
}




main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
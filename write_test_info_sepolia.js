const { ethers, network } = require("hardhat");
const fs = require("fs/promises");
const path = require("path");
const testInfoPath = path.join(__dirname, "test-info-sepolia.txt");


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

    return [provider, ownerSigner, buyerSigners];
}

async function writeRandomNumbers() {

    const [provider, ownerSigner, buyerSigners] = await getProviderAndSigners();

    const testInfoFile = await fs.open(testInfoPath, "a");

    let signerAddress = await ownerSigner.getAddress();
    let randomNumber = ethers.toBigInt(ethers.randomBytes(32));
    let wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
    let randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, signerAddress]));

    testInfoFile.write("OWNER (METAMASK 1)\n");
    testInfoFile.write(`Address: ${await ownerSigner.getAddress()}\nRandom Number: ${randomNumber}\nWrong Random Number: ${wrongRandomNumber}\nRandom Number Hash: ${randomNumberHash}\n\n`);

    testInfoFile.write("METAMASK ACCOUNTS\n");
    for (let i = 0; i < buyerSigners.length; i++) {
        signerAddress = await buyerSigners[i].getAddress();
        randomNumber = ethers.toBigInt(ethers.randomBytes(32));
        wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
        randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, signerAddress]));

        testInfoFile.write(`${i + 2}\n Address: ${signerAddress}\nRandom Number: ${randomNumber}\nWrong Random Number: ${wrongRandomNumber}\nRandom Number Hash: ${randomNumberHash}\n\n`);
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
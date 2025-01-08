const fs = require("fs/promises");
const path = require("path");

// Set paths relative to "server.js", because this file is imported in "server.js" and called there
const lotteryTokenPath = "../artifacts/contracts/LotteryToken.sol/LotteryToken.json";
const diamondPath = "../artifacts/contracts/Diamond.sol/Diamond.json";
const ownershipFacetPath = "../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json";
const userFacetPath = "../artifacts/contracts/facets/UserFacet.sol/UserFacet.json";
const libDiamondPath = "../artifacts/contracts/libraries/LibDiamond.sol/LibDiamond.json";

// const lotteryTokenPath = "../../artifacts/contracts/LotteryToken.sol/LotteryToken.json";
// const diamondPath = "../../artifacts/contracts/Diamond.sol/Diamond.json";
// const ownershipFacetPath = "../../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json";
// const userFacetPath = "../../artifacts/contracts/facets/UserFacet.sol/UserFacet.json";

async function getAbisAndBytecodes() {
    const abis = new Map();
    const bytecodes = new Map();

    const lotteryToken = JSON.parse(await fs.readFile(lotteryTokenPath, { encoding: 'utf8' }));
    abis.set('LotteryToken', lotteryToken.abi);
    bytecodes.set('LotteryToken', lotteryToken.bytecode);

    const diamond = JSON.parse(await fs.readFile(diamondPath, { encoding: 'utf8' }));
    abis.set('Diamond', diamond.abi);
    bytecodes.set('Diamond', diamond.bytecode);

    const ownershipFacet = JSON.parse(await fs.readFile(ownershipFacetPath, { encoding: 'utf8' }));
    abis.set('OwnershipFacet', ownershipFacet.abi);
    bytecodes.set('OwnershipFacet', ownershipFacet.bytecode);

    const userFacet = JSON.parse(await fs.readFile(userFacetPath, { encoding: 'utf8' }));
    abis.set('UserFacet', userFacet.abi);
    bytecodes.set('UserFacet', userFacet.bytecode);

    const libDiamond = JSON.parse(await fs.readFile(libDiamondPath, { encoding: 'utf8' }));
    abis.set('LibDiamond', libDiamond.abi);
    bytecodes.set('LibDiamond', libDiamond.bytecode);


    return [abis, bytecodes];
}

async function writeAbisAndBytecodesToFile() {
    const abis = {};
    const bytecodes = {};

    const lotteryToken = JSON.parse(await fs.readFile(lotteryTokenPath, { encoding: 'utf8' }));
    abis['LotteryToken'] = lotteryToken.abi;
    bytecodes['LotteryToken'] = lotteryToken.bytecode;

    const diamond = JSON.parse(await fs.readFile(diamondPath, { encoding: 'utf8' }));
    abis['Diamond'] = diamond.abi;
    bytecodes['Diamond'] = diamond.bytecode;

    const ownershipFacet = JSON.parse(await fs.readFile(ownershipFacetPath, { encoding: 'utf8' }));
    abis['OwnershipFacet'] = ownershipFacet.abi;
    bytecodes['OwnershipFacet'] = ownershipFacet.bytecode;

    const userFacet = JSON.parse(await fs.readFile(userFacetPath, { encoding: 'utf8' }));
    abis['UserFacet'] = userFacet.abi;
    bytecodes['UserFacet'] = userFacet.bytecode;

    const libDiamond = JSON.parse(await fs.readFile(libDiamondPath, { encoding: 'utf8' }));
    abis['LibDiamond'] = libDiamond.abi;
    bytecodes['LibDiamond'] = libDiamond.bytecode;

    const contractData = { abis, bytecodes };
    const contractDataPath = path.join(__dirname, '../public/contractData.json');
    await fs.writeFile(contractDataPath, JSON.stringify(contractData, null, 2));

    console.log("ABIs and bytecodes successfully written to contractData.json");

    return { abis, bytecodes };

}

module.exports = {
    writeAbisAndBytecodesToFile,
};
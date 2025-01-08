const { ethers } = require("hardhat");
const testHelpers = require("./test_helpers.js");
const diamondHelpers = require("./diamond_helpers.js");

async function deployDiamond() {
    // From the accounts that are created automatically by hardhat, set first one as the owner account and all others as buyer accounts
    const [ownerSigner, ...buyerSigners] = await ethers.getSigners();
    // Create owner object
    const owner = new testHelpers.Owner(ownerSigner);


    // Deploy LotteryToken
    const lotteryTokenFactory = await ethers.getContractFactory("LotteryToken");
    const lotteryToken = await lotteryTokenFactory.connect(owner.signer).deploy();
    await lotteryToken.waitForDeployment();
    console.log("LotteryToken deployed at: ", await lotteryToken.getAddress());


    // Deploy DiamondInit
    const diamondInitFactory = await ethers.getContractFactory("DiamondInit");
    const diamondInit = await diamondInitFactory.connect(owner.signer).deploy();
    await diamondInit.waitForDeployment();
    console.log("DiamondInit deployed at: ", await diamondInit.getAddress());


    // Deploy facets and set the `facetCuts` variable
    // console.log('')
    console.log('Deploying facets:');
    const facetNames = [
        'DiamondCutFacet',
        'DiamondLoupeFacet',
        'OwnershipFacet',
        'UserFacet'
    ];
    const facetFactories = new Map();
    // The `facetCuts` variable is the FacetCut[] that contains the functions to add during diamond deployment
    const facetCuts = [];
    for (const facetName of facetNames) {
        const facetFactory = await ethers.getContractFactory(facetName);
        const facet = await facetFactory.connect(owner.signer).deploy();
        await facet.waitForDeployment();
        console.log(`\t${facetName} deployed at: ${await facet.getAddress()}`);

        facetFactories.set(facetName, facetFactory);

        facetCuts.push({
            facetAddress: await facet.getAddress(),
            action: diamondHelpers.FacetCutAction.Add,
            functionSelectors: diamondHelpers.getSelectors(facet)
        });
    }


    // Creating a function call
    // This call gets executed during deployment and can also be executed in upgrades
    // It is executed with delegatecall on the DiamondInit address.
    const initFragment = diamondInit.interface.getFunction("init");
    let initCall = diamondInit.interface.encodeFunctionData(initFragment);


    // Setting arguments that will be used in the diamond constructor
    const diamondArgs = {
        owner: await owner.signer.getAddress(),
        init: await diamondInit.getAddress(),
        initCalldata: initCall
    }

    // Deploy Diamond
    const diamondFactory = await ethers.getContractFactory("Diamond");
    const diamond = await diamondFactory.connect(owner.signer).deploy(facetCuts, diamondArgs);
    await diamond.waitForDeployment();
    console.log("Diamond deployed at: ", await diamond.getAddress());


    return [owner, facetFactories, await diamond.getAddress(), await lotteryToken.getAddress()];

}


async function main() {

    const [owner, facetFactories, diamondAdress, lotteryTokenAddress] = await deployDiamond();
    // console.log("Owner address: ", await owner.signer.getAddress());
    // console.log("Facets and factories: ", facetFactories);
    // console.log("Diamond address: ", diamondAdress);
    // console.log("LotteryToken address: ", lotteryTokenAddress);
    console.log("Diamond deployment complete.");
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
    deployDiamond
}


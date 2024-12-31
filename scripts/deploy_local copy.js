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

    try {
        const ownershipFacet = facetFactories.get("OwnershipFacet").attach(await diamond.getAddress());

        let tx = await ownershipFacet.connect(owner.signer).setPaymentToken(await lotteryToken.getAddress());

        let receipt = await tx.wait();

        let events = await diamond.queryFilter(ownershipFacet.filters.PaymentTokenSet, receipt.blockNumber, receipt.blockNumber);

        const setPaymentTokenAddress = events[0].args[0];
        const expectedPaymentTokenAddress = await lotteryToken.getAddress();

        console.log(`${expectedPaymentTokenAddress} - Expected payment token address\n`);
        console.log(`${setPaymentTokenAddress} - Address emitted by function\n\n`);



        // const userFacet = facetFactories.get("UserFacet").attach(await diamond.getAddress());
        // const currentLotteryNo = Number(await userFacet.connect(owner.signer).getCurrentLotteryNo());
        // console.log("Current lottery no: ", currentLotteryNo);
    }
    catch (error) {
        console.error("Error: ", error);
    }

    return [owner, facetFactories, await diamond.getAddress()];



    // console.log("ethers:", typeof ethers);
    // console.log(ethers);

    // let functionCall = diamondInit.interface.encodeFunctionData("init");
    // console.log(typeof functionCall);
    // console.log(functionCall);

    // const ff = diamondInit.interface.fragments[0];
    // let functionCall2 = diamondInit.interface.encodeFunctionData(ff);
    // console.log(functionCall2);

    // const ff2 = diamondInit.interface.getFunction("init");
    // let functionCall3 = diamondInit.interface.encodeFunctionData(ff2);
    // console.log(functionCall3);

    // console.log(ff.selector, ff2.selector);
    // console.log(lotteryToken);

    // console.log("Type of 'fragments':", typeof fragments);
    // console.log(fragments.length);
    // console.log(functionFragments.length);
    // console.log(typeof functionFragments[0]);
    // console.log(functionFragments[0]);

}







async function main2() {
    // From the accounts that are created automatically by hardhat, set first one as the owner account and all others as buyer accounts
    const [ownerSigner, ...buyerSigners] = await ethers.getSigners();

    // Create lotteries map to hold lottery objects by lottery number
    const lotteries = new Map();
    // Create owner object
    const owner = new Owner(ownerSigner);
    // Create buyers map to hold buyer objects by buyer id
    const buyers = createBuyersMap(buyerSigners);
    // Create gas usages object to hold gas usage data
    const gasUsages = new GasUsages();
    // Create test result directory
    const testResultsDirectory = await createTestResultsDirectory();

    // Create contract factories
    const lotteryTokenFactory = await ethers.getContractFactory("LotteryToken");
    const companyLotteriesFactory = await ethers.getContractFactory("CompanyLotteries");

    // Deploy contracts using the owner account
    const lotteryToken = await lotteryTokenFactory.connect(owner.signer).deploy();
    await lotteryToken.waitForDeployment();

    const companyLotteries = await companyLotteriesFactory.connect(owner.signer).deploy();
    await companyLotteries.waitForDeployment();


    await runFirstLottery(lotteries, owner, buyers, gasUsages, lotteryToken, companyLotteries, testResultsDirectory);

    await runSecondLottery(lotteries, owner, buyers, gasUsages, lotteryToken, companyLotteries, testResultsDirectory);

    await runThirdLottery(lotteries, owner, buyers, gasUsages, lotteryToken, companyLotteries, testResultsDirectory);

    await runForthLottery(lotteries, owner, buyers, gasUsages, lotteryToken, companyLotteries, testResultsDirectory);

    await runFifthLottery(lotteries, owner, buyers, gasUsages, lotteryToken, companyLotteries, testResultsDirectory);

    await reportGasUsages(gasUsages, testResultsDirectory);

}

async function main() {
    // const abi = testHelpers.getPaymentTokenABI();
    // console.log(typeof abi);
    // console.log(typeof diamondHelpers.FacetCutAction);

    const [owner, diamondAdress] = await deployDiamond();
    console.log("Owner address: ", await owner.signer.getAddress());
    console.log("Diamond address: ", diamondAdress);
}

// Hardhat recommends this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
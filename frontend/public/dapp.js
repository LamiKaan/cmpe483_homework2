import { ethers } from "ethers";

let provider;
let signer;
let ownershipFacet;
let userFacet;
let diamond;
let lotteryToken;
let libDiamond;
let contract;

// Define Diamond's ABI and address here
// const diamondABI = [/* ABI from OwnershipFacet */];
const diamondAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
const lotteryTokenAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

// INITIALIZATION FUNCTIONS

async function createSignersManually() {

}


async function loadContractData() {
    const response = await fetch("/contractData.json");
    const contractData = await response.json();

    console.log("Contract Data (ABIs and bytecodes) has been loaded.");

    return contractData;
}


async function connectMetaMask() {

    // Get the ABIs and bytecodes of contracts
    const contractData = await loadContractData();
    const abis = contractData.abis;
    const bytecodes = contractData.bytecodes;

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        const approvedAccounts = await provider.send("eth_requestAccounts", []);

        console.log("Approved Accounts:");
        for (const account of approvedAccounts) {
            console.log(account);
        }

        // console.log(`Approved Accounts: ${approvedAccounts}\n`);

        signer = await provider.getSigner();
        // contract = new ethers.Contract(diamondAddress, diamondABI, signer);

        // Set contracts
        diamond = new ethers.BaseContract(diamondAddress, abis["Diamond"]);
        lotteryToken = new ethers.BaseContract(lotteryTokenAddress, abis["LotteryToken"]);

        const ownershipFacetFactory = new ethers.ContractFactory(abis["OwnershipFacet"], bytecodes["OwnershipFacet"]);
        ownershipFacet = ownershipFacetFactory.attach(diamondAddress);

        const userFacetFactory = new ethers.ContractFactory(abis["UserFacet"], bytecodes["UserFacet"]);
        userFacet = userFacetFactory.attach(diamondAddress);

        libDiamond = new ethers.Interface(abis["LibDiamond"]);

    } else {
        alert("MetaMask is not installed");
    }
}

// GENERAL DIV FUNCTIONS

async function getBlockTimestamp() {
    try {
        const latestBlock = await provider.getBlock('latest');
        const timestamp = latestBlock.timestamp;

        document.getElementById("getBlockTimestampOutput").innerHTML = `<b>Timestamp:</b> ${timestamp}`;
    } catch (error) {
        console.error(error);
        document.getElementById("getBlockTimestampOutput").innerText = "Error";
    }
}

async function getCurrentSigner() {
    try {
        signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        document.getElementById("getSignerOutput").innerHTML = `<b>Current Signer:</b> ${signerAddress}`;
    } catch (error) {
        console.error(error);
        document.getElementById("getSignerOutput").innerText = "Error";
    }
}

// LOTTERY TOKEN DIV FUNCTIONS

async function buyTokens() {
    try {
        signer = await provider.getSigner();

        console.log("Signer: ", signer);

        const gweiAmount = document.getElementById("gweiAmount").value;

        console.log("Gwei Amount: ", gweiAmount);
        console.log("String Gwei Amount: ", gweiAmount.toString());

        const tx = await lotteryToken.connect(signer).buyTokens(gweiAmount, { value: ethers.parseUnits(gweiAmount.toString(), "gwei") });

        console.log("Transaction: ", tx);

        const receipt = await tx.wait();

        console.log("Receipt: ", receipt);

        document.getElementById("buyTokensOutput").innerHTML = `<b>Done</b>`;

    } catch (error) {
        console.log(error);
        console.error(error.info);
        document.getElementById("buyTokensOutput").innerText = error.shortMesssage;
    }

}

async function getSignerBalance() {
    try {
        signer = await provider.getSigner();

        const balance = await lotteryToken.connect(signer).balanceOf(await signer.getAddress());

        document.getElementById("getSignerBalanceOutput").innerHTML = `<b>Balance:</b> ${balance} LT`;
    } catch (error) {
        console.error(error.info);
        document.getElementById("getSignerBalanceOutput").innerText = error.shortMesssage;
    }
}

async function getAccountBalance() {
    try {
        signer = await provider.getSigner();

        const accountAddress = document.getElementById("accountAddress").value;
        const balance = await lotteryToken.connect(signer).balanceOf(accountAddress);

        document.getElementById("getAccountBalanceOutput").innerHTML = `<b>Balance:</b> ${balance} LT`;
    } catch (error) {
        console.error(error.info);
        document.getElementById("getAccountBalanceOutput").innerText = error.shortMesssage;
    }
}

// USER FACET DIV FUNCTIONS

async function getCurrentLotteryNo() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = await userFacet.connect(signer).getCurrentLotteryNo();

        document.getElementById("getCurrentLotteryNoOutput").innerHTML = `<b>Current Lottery Number:</b> ${lotteryNumber}`;
    } catch (error) {
        console.error(error.info);
        document.getElementById("getCurrentLotteryNoOutput").innerText = error.shortMesssage;
    }
}

async function getLotteryInfo() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getLotteryInfo"]').value;

        const currentLotteryInfo = await userFacet.connect(signer).getLotteryInfo(lotteryNumber);
        const [unixend, nooftickets, noofwinners, minpercentage, ticketprice] = currentLotteryInfo.map((value) => Number(value));

        document.getElementById("getLotteryInfoOutput").innerHTML = `<b>Lottery Number:</b> ${lotteryNumber}<br /><b>End Time:</b> ${unixend}<br /><b>Tickets Issued:</b> ${nooftickets}<br /><b>Number of Winners:</b> ${noofwinners}<br /><b>Minimum Percentage:</b> ${minpercentage}<br /><b>Ticket Price:</b> ${ticketprice}`;

    } catch (error) {
        console.error(error.info);
        document.getElementById("getCurrentLotteryNoOutput").innerText = error.shortMesssage;
    }
}

async function getPaymentToken() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getPaymentToken"]').value;

        const paymentTokenAddress = await userFacet.connect(signer).getPaymentToken(lotteryNumber);

        document.getElementById("getPaymentTokenOutput").innerHTML = `<b>Payment token address:</b> ${paymentTokenAddress}`;
    } catch (error) {
        console.error(error.info);
        document.getElementById("getPaymentTokenOutput").innerText = error.shortMesssage;
    }
}

// OWNERSHIP FACET DIV FUNCTIONS

async function setPaymentToken() {
    try {
        signer = await provider.getSigner();

        const paymentTokenAddress = document.getElementById("paymentTokenAddress").value;
        const tx = await ownershipFacet.connect(signer).setPaymentToken(paymentTokenAddress);
        const receipt = await tx.wait();
        const events = await diamond.connect(provider).queryFilter(ownershipFacet.filters.PaymentTokenSet, receipt.blockNumber, receipt.blockNumber);
        const setPaymentTokenAddress = events[0].args[0];

        document.getElementById("setPaymentTokenOutput").innerHTML = `<b>Payment token set: </b> ${setPaymentTokenAddress}`;
    } catch (error) {

        const errorInterface = new ethers.Interface([
            "error NotContractOwner(address _user, address _contractOwner)"
        ]);

        const decodedError = errorInterface.parseError(error.data);

        if (decodedError.name !== undefined) {
            document.getElementById("setPaymentTokenOutput").innerText = decodedError.name;
        } else {
            console.error(error);
            document.getElementById("setPaymentTokenOutput").innerText = "Error";
        }

    }
}


async function createLottery() {
    try {
        signer = await provider.getSigner();

        const endTime = document.getElementById("endTime").value;
        const ticketsIssued = document.getElementById("ticketsIssued").value;
        const numberOfWinners = document.getElementById("numberOfWinners").value;
        const minPercentage = document.getElementById("minPercentage").value;
        const ticketPrice = document.getElementById("ticketPrice").value;
        const htmlHash = document.getElementById("htmlHash").value;
        const url = document.getElementById("url").value;

        const tx = await ownershipFacet.connect(signer).createLottery(endTime, ticketsIssued, numberOfWinners, minPercentage, ticketPrice, htmlHash, url);
        const receipt = await tx.wait();
        const lotteryNumber = receipt.events[0].args.newLotteryNumber;

        document.getElementById("createLotteryOutput").innerText = `Lottery Created: ${lotteryNumber}`;
    } catch (error) {

        console.log(error);

        const errorInterface = new ethers.Interface([
            "error NotContractOwner(address _user, address _contractOwner)"
        ]);

        const decodedError = errorInterface.parseError(error.data);

        if (decodedError.name !== undefined) {
            document.getElementById("setPaymentTokenOutput").innerText = decodedError.name;
        } else {
            console.error(error);
            document.getElementById("setPaymentTokenOutput").innerText = "Error";
        }
    }
}

// VIEW CONTRACT ADDRESSES AT THE TOP OF THE PAGE
document.getElementById("diamondAddress").innerHTML = `<b> Diamond address:</b> ${diamondAddress}`;
document.getElementById("lotteryTokenAddress").innerHTML = `<b> Lottery Token address:</b> ${lotteryTokenAddress}`;


// GENERAL SECTION EVENT LISTENERS
document.getElementById("getBlockTimestamp").addEventListener("click", getBlockTimestamp);
document.getElementById("getSigner").addEventListener("click", getCurrentSigner);

// LOTTERY SECTION EVENT LISTENERS
document.getElementById("buyTokens").addEventListener("click", buyTokens);
document.getElementById("getSignerBalance").addEventListener("click", getSignerBalance);
document.getElementById("getAccountBalance").addEventListener("click", getAccountBalance);

// USER SECTION EVENT LISTENERS
document.getElementById("getCurrentLotteryNo").addEventListener("click", getCurrentLotteryNo);
document.getElementById("getLotteryInfo").addEventListener("click", getLotteryInfo);
document.getElementById("getPaymentToken").addEventListener("click", getPaymentToken);

// OWNERSHIP SECTION EVENT LISTENERS
document.getElementById("setPaymentToken").addEventListener("click", setPaymentToken);
document.getElementById("createLottery").addEventListener("click", createLottery);

// 
// document.getElementById("createLottery").addEventListener("click", createLottery);
connectMetaMask();




// document.addEventListener("DOMContentLoaded", () => {
//     const blockTimestampButton = document.getElementById("getBlockTimestamp");
//     console.log(blockTimestampButton); // Should log the button element if it exists
//     if (!blockTimestampButton) {
//         console.error("Element with ID 'getBlockTimestamp' not found in DOM!");
//     }


//     // GENERAL SECTION EVENT LISTENERS
//     document.getElementById("getBlockTimestamp").addEventListener("click", getBlockTimestamp);
//     document.getElementById("getSigner").addEventListener("click", getSigner);
//     // LOTTERY SECTION EVENT LISTENERS

//     // 
//     // document.getElementById("createLottery").addEventListener("click", createLottery);
//     connectMetaMask();
// });
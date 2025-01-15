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

async function approve() {
    try {
        signer = await provider.getSigner();

        const spenderAddress = document.querySelector('#spenderAddress[data-region="approve"]').value;
        const approveAmount = document.querySelector('#approveAmount[data-region="approve"]').value;

        const success = await lotteryToken.connect(signer).approve(spenderAddress, approveAmount);
        // const tx = await lotteryToken.connect(signer).approve(spenderAddress, approveAmount);
        // const receipt = await tx.wait();

        console.log("Success: \n", success);
        // console.log(`TX:\n${tx}`);
        // console.log(`RECEIPT:\n${receipt}`);

        if (success) {
            document.getElementById("approveOutput").innerHTML = `<b>Done</b>`;
        } else {
            console.log("Success: \n", success);
        }

        // if (receipt !== undefined && receipt !== null) {
        //     document.getElementById("approveOutput").innerHTML = `<b>Done</b>`;
        // }
        // else {
        //     console.log(`TX:\n${tx}`);
        //     console.log(`RECEIPT:\n${receipt}`);
        // }


    } catch (error) {
        console.log(error);
        console.error(error.info);
        document.getElementById("approveOutput").innerText = error.shortMesssage;
    }

}

async function checkAllowance() {
    try {
        signer = await provider.getSigner();

        const ownerAddress = document.querySelector('#ownerAddress[data-region="allowance"]').value;
        const spenderAddress = document.querySelector('#spenderAddress[data-region="allowance"]').value;

        console.log("Owner Address: ", ownerAddress);
        console.log("Spender Address: ", spenderAddress);

        const allowanceAmount = await lotteryToken.connect(signer).allowance(ownerAddress, spenderAddress);
        // const tx = await lotteryToken.connect(signer).allowance(ownerAddress, spenderAddress);
        // const receipt = await tx.wait();

        console.log("Allowance Amount: \n", allowanceAmount);

        if (allowanceAmount !== undefined && allowanceAmount !== null) {
            document.getElementById("allowanceOutput").innerHTML = `<b>Allowance amount:</b> ${allowanceAmount}`;
        } else {
            console.log("Allowance Amount: \n", allowanceAmount);
        }

        // if (receipt !== undefined && receipt !== null) {
        //     document.getElementById("allowanceOutput").innerHTML = `<b>Done</b>`;
        // }
        // else {
        //     console.log(`TX:\n${tx}`);
        //     console.log(`RECEIPT:\n${receipt}`);
        // }

    } catch (error) {
        console.log(error);
        console.error(error.info);
        document.getElementById("allowanceOutput").innerText = error.shortMesssage;
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

async function getRevealTime() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getRevealTime"]').value;

        const revealTime = await userFacet.connect(signer).getRevealTime(lotteryNumber);

        document.getElementById("getRevealTimeOutput").innerHTML = `<b>Reveal time:</b> ${revealTime}`;

    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("getRevealTimeOutput").innerText = error.shortMesssage;
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

async function getLotteryURL() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getLotteryURL"]').value;

        const lotteryURL = await userFacet.connect(signer).getLotteryURL(lotteryNumber);
        const [htmlhash, url] = lotteryURL;

        document.getElementById("getLotteryURLOutput1").innerHTML = `<b>HTML hash:</b> ${htmlhash}`;
        document.getElementById("getLotteryURLOutput2").innerHTML = `<b>URL:</b> ${url}`;
    } catch (error) {
        console.error(error.info);
        document.getElementById("getLotteryURLOutput1").innerText = error.shortMesssage;
    }
}

async function buyTicket() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="buyTicketTx"]').value;
        const quantity = document.querySelector('#quantity[data-region="buyTicketTx"]').value;
        const hashRandomNumber = document.querySelector('#randomNumberHash[data-region="buyTicketTx"]').value;

        const tx = await userFacet.connect(signer).buyTicketTx(lotteryNumber, quantity, hashRandomNumber);

        console.log("TX: ", tx);

        const receipt = await tx.wait();

        console.log("RECEIPT: ", receipt);

        const events = await diamond.connect(provider).queryFilter(userFacet.filters.NewPurchaseMade, receipt.blockNumber, receipt.blockNumber);

        console.log("EVENTS: ", events);

        const startTicketNo = Number(events[0].args[0]);

        document.getElementById("buyTicketTxOutput").innerHTML = `<b>Start ticket no:</b> ${startTicketNo}`;

    } catch (error) {
        console.log("ERROR: \n", error);
        console.error(error.info);
        document.getElementById("buyTicketTxOutput").innerText = error.shortMesssage;
    }
}

async function getLotterySales() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getLotterySales"]').value;

        const lotterySales = await userFacet.connect(signer).getLotterySales(lotteryNumber);

        document.getElementById("getLotterySalesOutput").innerHTML = `<b>Number of sold tickets:</b> ${lotterySales}`;

    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("getLotterySalesOutput").innerText = error.shortMesssage;
    }
}

async function getNumPurchaseTxs() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getNumPurchaseTxs"]').value;

        const purchasesMade = await userFacet.connect(signer).getNumPurchaseTxs(lotteryNumber);

        document.getElementById("getNumPurchaseTxsOutput").innerHTML = `<b>Number of purchase transactions:</b> ${purchasesMade}`;

    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("getNumPurchaseTxsOutput").innerText = error.shortMesssage;
    }
}

async function getIthPurchasedTicketTx() {
    try {
        signer = await provider.getSigner();

        const i = document.querySelector('#i[data-region="getIthPurchasedTicketTx"]').value;
        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getIthPurchasedTicketTx"]').value;

        const purchase = await userFacet.connect(signer).getIthPurchasedTicketTx(i, lotteryNumber);
        const [startTicketNo, quantity] = purchase;

        document.getElementById("getIthPurchasedTicketTxOutput1").innerHTML = `<b>Start ticket no:</b> ${startTicketNo}`;
        document.getElementById("getIthPurchasedTicketTxOutput2").innerHTML = `<b>Quantity:</b> ${quantity}`;
    } catch (error) {
        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("getIthPurchasedTicketTxOutput1").innerText = error.shortMesssage;
    }
}

async function revealRandomNumber() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="revealRndNumberTx"]').value;
        const startTicketNumber = document.querySelector('#startTicketNo[data-region="revealRndNumberTx"]').value;
        const quantity = document.querySelector('#quantity[data-region="revealRndNumberTx"]').value;
        const randomNumberText = document.querySelector('#randomNumber[data-region="revealRndNumberTx"]').value;
        const randomNumber = ethers.toBigInt(randomNumberText);

        const tx = await userFacet.connect(signer).revealRndNumberTx(lotteryNumber, startTicketNumber, quantity, randomNumber);

        console.log("TX: ", tx);

        const receipt = await tx.wait();

        console.log("RECEIPT: ", receipt);

        const isValid = (receipt.logs[0].fragment.name === "ValidReveal");

        const response = `${isValid === true ? "Valid - Successfully revealed the random number and obtained a chance at winning." : "Invalid - Provided random number doesn't produce the correct hash. Winning chance is lost, and there will be no refund."}`

        document.getElementById("revealRndNumberTxOutput").innerHTML = `<b>Reveal:</b> ${response}`;

    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("revealRndNumberTxOutput").innerText = error.shortMesssage;
    }
}

async function getIthWinningTicket() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="getIthWinningTicket"]').value;
        const i = document.querySelector('#i[data-region="getIthWinningTicket"]').value;

        const winningTicketNo = await userFacet.connect(signer).getIthWinningTicket(lotteryNumber, i);

        document.getElementById("getIthWinningTicketOutput").innerHTML = `<b>${i}th winning ticket no:</b> ${winningTicketNo}`;
    } catch (error) {
        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("getIthWinningTicketOutput").innerText = error.shortMesssage;
    }
}

async function checkIfMyTicketWon() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="checkIfMyTicketWon"]').value;
        const ticketNumber = document.querySelector('#ticketNo[data-region="checkIfMyTicketWon"]').value;

        const won = await userFacet.connect(signer).checkIfMyTicketWon(lotteryNumber, ticketNumber);

        document.getElementById("checkIfMyTicketWonOutput").innerHTML = `<b>Ticket(${ticketNumber}) status:</b> ${won === true ? "Won" : "Didn't win"}`;

    } catch (error) {
        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("checkIfMyTicketWonOutput").innerText = error.shortMesssage;
    }
}

async function checkIfAddrTicketWon() {
    try {
        signer = await provider.getSigner();

        const address = document.querySelector('#address[data-region="checkIfAddrTicketWon"]').value;
        const lotteryNumber = document.querySelector('#lotteryNo[data-region="checkIfAddrTicketWon"]').value;
        const ticketNumber = document.querySelector('#ticketNo[data-region="checkIfAddrTicketWon"]').value;

        const won = await userFacet.connect(signer).checkIfAddrTicketWon(address, lotteryNumber, ticketNumber);

        document.getElementById("checkIfAddrTicketWonOutput").innerHTML = `<b>Ticket(${ticketNumber}) status:</b> ${won === true ? "Won" : "Didn't win"}`;

    } catch (error) {
        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("checkIfAddrTicketWonOutput").innerText = error.shortMesssage;
    }
}

async function withdrawTicketRefund() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="withdrawTicketRefund"]').value;
        const startTicketNumber = document.querySelector('#startTicketNo[data-region="withdrawTicketRefund"]').value;

        const tx = await userFacet.connect(signer).withdrawTicketRefund(lotteryNumber, startTicketNumber);

        console.log("TX: ", tx);

        const receipt = await tx.wait();

        console.log("RECEIPT: ", receipt);

        const events = await diamond.connect(provider).queryFilter(userFacet.filters.PaymentMade, receipt.blockNumber, receipt.blockNumber);

        console.log("EVENTS: ", events);

        const payedAmount = Number(events[0].args[0]);
        const remainingRefund = Number(events[0].args[1]);

        document.getElementById("withdrawTicketRefundOutput").innerHTML = `Payment made.<br /><b>Payed amount:</b> ${payedAmount} LT<br /><b>Remaining refund:</b> ${remainingRefund} LT`;

    } catch (error) {
        console.log(`CATCHED ERROR:\n${error}`);

        console.error(error.info);
        document.getElementById("withdrawTicketRefundOutput").innerText = error.shortMesssage;
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

        const events = await diamond.connect(provider).queryFilter(ownershipFacet.filters.NewLotteryCreated, receipt.blockNumber, receipt.blockNumber);
        const lotteryNumber = events[0].args[0];

        document.getElementById("createLotteryOutput").innerText = `Lottery Created: ${lotteryNumber}`;
    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        const errorInterface = new ethers.Interface([
            "error NotContractOwner(address _user, address _contractOwner)"
        ]);

        const decodedError = errorInterface.parseError(error.data);

        if (decodedError.name !== undefined) {
            document.getElementById("createLotteryOutput").innerText = decodedError.name;
        } else {
            console.error(error);
            document.getElementById("createLotteryOutput").innerText = "Error";
        }
    }
}

async function finalizeLottery() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="finalizeLottery"]').value;

        const tx = await ownershipFacet.connect(signer).finalizeLottery(lotteryNumber);

        console.log("TX: ", tx);

        const receipt = await tx.wait();

        console.log("RECEIPT: ", receipt);

        const isCancelled = (receipt.logs[0].fragment.name === "Cancelled");

        const response = `${isCancelled === true ? "Cancelled" : "Finalized successfully"}`;

        document.getElementById("finalizeLotteryOutput").innerHTML = `<b>Lottery status:</b> ${response}`;
    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        const errorInterface = new ethers.Interface([
            "error NotContractOwner(address _user, address _contractOwner)"
        ]);

        const decodedError = errorInterface.parseError(error.data);

        if (decodedError.name !== undefined) {
            document.getElementById("finalizeLotteryOutput").innerText = decodedError.name;
        } else {
            console.error(error);
            document.getElementById("finalizeLotteryOutput").innerText = "Error";
        }

    }
}

async function withdrawTicketProceeds() {
    try {
        signer = await provider.getSigner();

        const lotteryNumber = document.querySelector('#lotteryNo[data-region="withdrawTicketProceeds"]').value;

        const tx = await ownershipFacet.connect(signer).withdrawTicketProceeds(lotteryNumber);

        console.log("TX: ", tx);

        const receipt = await tx.wait();

        console.log("RECEIPT: ", receipt);

        document.getElementById("withdrawTicketProceedsOutput").innerHTML = `<b>Done</b>`;
    } catch (error) {

        console.log(`CATCHED ERROR:\n${error}`);

        const errorInterface = new ethers.Interface([
            "error NotContractOwner(address _user, address _contractOwner)"
        ]);

        const decodedError = errorInterface.parseError(error.data);

        if (decodedError.name !== undefined) {
            document.getElementById("withdrawTicketProceedsOutput").innerText = decodedError.name;
        } else {
            console.error(error);
            document.getElementById("withdrawTicketProceedsOutput").innerText = "Error";
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
document.getElementById("approve").addEventListener("click", approve);
document.getElementById("allowance").addEventListener("click", checkAllowance);


// USER SECTION EVENT LISTENERS
document.getElementById("getCurrentLotteryNo").addEventListener("click", getCurrentLotteryNo);
document.getElementById("getLotteryInfo").addEventListener("click", getLotteryInfo);
document.getElementById("getRevealTime").addEventListener("click", getRevealTime);
document.getElementById("getPaymentToken").addEventListener("click", getPaymentToken);
document.getElementById("getLotteryURL").addEventListener("click", getLotteryURL);
document.getElementById("buyTicketTx").addEventListener("click", buyTicket);
document.getElementById("getLotterySales").addEventListener("click", getLotterySales);
document.getElementById("getNumPurchaseTxs").addEventListener("click", getNumPurchaseTxs);
document.getElementById("getIthPurchasedTicketTx").addEventListener("click", getIthPurchasedTicketTx);
document.getElementById("revealRndNumberTx").addEventListener("click", revealRandomNumber);
document.getElementById("getIthWinningTicket").addEventListener("click", getIthWinningTicket);
document.getElementById("checkIfMyTicketWon").addEventListener("click", checkIfMyTicketWon);
document.getElementById("checkIfAddrTicketWon").addEventListener("click", checkIfAddrTicketWon);
document.getElementById("withdrawTicketRefund").addEventListener("click", withdrawTicketRefund);

// OWNERSHIP SECTION EVENT LISTENERS
document.getElementById("setPaymentToken").addEventListener("click", setPaymentToken);
document.getElementById("createLottery").addEventListener("click", createLottery);
document.getElementById("finalizeLottery").addEventListener("click", finalizeLottery);
document.getElementById("withdrawTicketProceeds").addEventListener("click", withdrawTicketProceeds);

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
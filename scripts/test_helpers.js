// const { ethers, network } = require("hardhat");
const fs = require("fs/promises");
const path = require("path");
// const exp = require("constants");
// const { boolean } = require("hardhat/internal/core/params/argumentTypes");
const paymentTokenPath = "./artifacts/contracts/LotteryToken.sol/LotteryToken.json";
const lottertTokenPath = paymentTokenPath;
const diamondPath = "./artifacts/contracts/Diamond.sol/Diamond.json";
const ownershipFacetPath = "./artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json";
const userFacetPath = "./artifacts/contracts/facets/UserFacet.sol/UserFacet.json";

async function getPaymentTokenABI() {
    return JSON.parse(await fs.readFile(paymentTokenPath, { encoding: 'utf8' })).abi;
}

async function getAbisAndBytecodes() {
    const abis = new Map();
    const bytecodes = new Map();

    const lotteryToken = JSON.parse(await fs.readFile(lottertTokenPath, { encoding: 'utf8' }));
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

    return [abis, bytecodes];
}

async function createTestResultsDirectory() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dirName = `testResults_${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
    const dirPath = path.join(__dirname, dirName);

    // Create the directory
    await fs.mkdir(dirPath, { recursive: true });

    return dirPath;
}

class Purchase {
    constructor(buyer, startTicketNo, quantity, randomNumber, wrongRandomNumber, hashRandomNumber) {
        this.buyer = buyer;
        this.startTicketNo = startTicketNo;
        this.quantity = quantity;
        this.randomNumber = randomNumber;
        this.wrongRandomNumber = wrongRandomNumber;
        this.hashRandomNumber = hashRandomNumber;
        this.isValid = false;
        this.winnerTickets = [];
    }

}

class Lottery {
    constructor(id, startTime, ticketsIssued, numberOfWinners, minPercentage, ticketPrice, htmlHash, url) {
        this.id = id;
        this.startTime = startTime; // Set start time to now
        this.revealTime = 0;
        this.endTime = this.startTime + 30 * 60; // Set end time to 30 minutes from start time (selected as sufficiently long duration for testing purposes)
        this.ticketsIssued = ticketsIssued;
        this.numberOfWinners = numberOfWinners;
        this.minPercentage = minPercentage;
        this.ticketPrice = ticketPrice;
        this.htmlHash = htmlHash;
        this.url = url;
        // Mapping from buyer id to buyer objects of the lottery
        this.buyers = new Map();
        // Array to hold all purchase transaction objects of the lottery
        this.purchases = [];
        // Mapping from each sold ticket number to the purchase object contaning the ticket
        this.ticketPurchases = new Map();
        // Array to hold winning ticket numbers
        this.winnerTickets = [];
    }
}

class Owner {
    constructor(signer) {
        this.signer = signer;
        // Mappings from lottery number to lottery token balance of the buyer at different stages of the lottery
        this.balanceBeforeLotteryProceeds = new Map();
        this.balanceAfterLotteryProceeds = new Map();
    }
}

class Buyer {
    constructor(id, signer) {
        this.id = id;
        this.signer = signer;
        // Mappings from lottery number to lottery token balance of the buyer at different stages of the lottery
        this.balanceBeforeLotteryPurchases = new Map();
        this.balanceAfterLotteryPurchases = new Map();
        this.balanceAfterLotteryRefunds = new Map();
        // Mappings from lottery number to purchases of the buyer for the lottery (Purchase[])
        this.lotteryPurchases = new Map();
        this.currentLotteryNo;
        this.currentTicketPrice;
        this.currentLotteryToken;
    }

    addToMap(map, key, value) {
        if (map === this.lotteryPurchases) {

            if (!map.has(key)) {
                map.set(key, [value]);
            }
            else {
                map.get(key).push(value);
            }

        }
        else {
            map.set(key, value);
        }
    }
}

function createBuyersMap(buyerSigners) {
    const buyers = new Map();

    for (let i = 0; i < buyerSigners.length; i++) {
        // Create new buyer (start ids from 1)
        const buyer = new Buyer(i + 1, buyerSigners[i]);
        // Add to map
        buyers.set(buyer.id, buyer);
    }

    return buyers;
}

class GasUsages {
    constructor() {
        this.createLottery = []; //checked
        this.buyTicketTx = []; //checked
        this.revealRndNumberTx = []; // checked
        this.getNumPurchaseTxs = []; // checked
        this.getIthPurchasedTicketTx = []; // checked
        this.checkIfMyTicketWon = []; //checked
        this.checkIfAddrTicketWon = []; // checked
        this.getIthWinningTicket = []; // checked
        this.withdrawTicketRefund = [];
        this.getCurrentLotteryNo = []; //checked
        this.withdrawTicketProceeds = [];
        this.setPaymentToken = []; //checked
        this.getPaymentToken = []; //checked
        this.getLotteryInfo = []; //checked
        this.getLotteryURL = []; //checked
        this.getLotterySales = []; //checked
    }
}

module.exports = {
    getPaymentTokenABI,
    getAbisAndBytecodes,
    createTestResultsDirectory,
    Purchase,
    Lottery,
    Owner,
    Buyer,
    GasUsages,
    createBuyersMap
};
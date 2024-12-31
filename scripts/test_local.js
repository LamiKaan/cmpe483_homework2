const { ethers, network } = require("hardhat");
const fs = require("fs/promises");
const path = require("path");
const { getPaymentTokenABI,
    createTestResultsDirectory,
    Purchase,
    Lottery,
    Owner,
    Buyer,
    GasUsages,
    createBuyersMap } = require("./test_helpers.js");
const diamondHelpers = require("./diamond_helpers.js");
const { deployDiamond } = require("./deploy_local.js");


async function runFirstLottery(lotteries, owner, buyers, gasUsages, diamondAddress, lotteryTokenAddress, facetFactories, testResultsDirectory) {

    // Set mock data for html contents and url
    const htmlContents = "Mock HTML contents";
    const url = "www.mock-url.com";
    const htmlHash = ethers.keccak256(ethers.toUtf8Bytes(htmlContents));
    // For the first lottery, set start time to now (convert to seconds from milliseconds)
    const startTime = Math.floor(Date.now() / 1000);


    // Create 1st lottery object (with 10 tickets, 1 winner, 50% minimum percentage, and 10 lottery tokens as ticket price)
    const lottery = new Lottery(1, startTime, 10, 1, 50, 10, htmlHash, url);


    // Create the test result file for the first lottery and open it in write mode
    const testResultFilePath = path.join(testResultsDirectory, "test1_10users.txt");
    const testResultFile = await fs.open(testResultFilePath, "w");

    // Get diamond contract
    const diamond = await ethers.getContractAt("Diamond", diamondAddress, owner.signer);


    // Set payment token of diamond to lottery token contract
    const ownershipFacet = facetFactories.get("OwnershipFacet").attach(diamondAddress);
    let tx = await ownershipFacet.connect(owner.signer).setPaymentToken(lotteryTokenAddress);
    let receipt = await tx.wait();
    let events = await diamond.queryFilter(ownershipFacet.filters.PaymentTokenSet, receipt.blockNumber, receipt.blockNumber);

    const setPaymentTokenAddress = events[0].args[0];
    const expectedPaymentTokenAddress = lotteryTokenAddress;

    await testResultFile.write(`${expectedPaymentTokenAddress} - Expected payment token address\n`);
    await testResultFile.write(`${setPaymentTokenAddress} - Address emitted by function\n\n`);


    // Set the next block timestamp to the lottery start time
    await network.provider.send("evm_setNextBlockTimestamp", [lottery.startTime]);


    // Create lottery from diamond. Since the hardhat network mines a new block with each transaction, when we call the createLottery function, the block timestamp will be the lottery start time
    tx = await ownershipFacet.connect(owner.signer).createLottery(lottery.endTime, lottery.ticketsIssued, lottery.numberOfWinners, lottery.minPercentage, lottery.ticketPrice, lottery.htmlHash, lottery.url);
    receipt = await tx.wait();
    // Add gas usage to gas usages object
    gasUsages.createLottery.push(receipt.gasUsed);
    // Get created lottery number from NewLotteryCreated event emitted by createLottery function
    events = await diamond.queryFilter(ownershipFacet.filters.NewLotteryCreated, receipt.blockNumber, receipt.blockNumber);

    const createdLotteryNumber = Number(events[0].args[0]);
    const expectedLotteryNumber = lottery.id;
    // Check if createLottery function works correctly
    await testResultFile.write('Check if "createLottery" function works correctly:\n');
    await testResultFile.write(`${expectedLotteryNumber} - Expected lottery number\n`);
    await testResultFile.write(`${createdLotteryNumber} - Lottery number emitted by function\n\n`);

    // Get user facet for buyer operations
    const userFacet = facetFactories.get("UserFacet").attach(diamondAddress);


    // Let buyers discover the current lottery
    for (const buyer of buyers.values()) {

        // First, get the current lottery no
        const currentLotteryNo = Number(await userFacet.connect(buyer.signer).getCurrentLotteryNo());
        // Check (once) if getCurrentLotteryNo function works correctly
        if (buyer.id === 1) {
            await testResultFile.write('Check if "getCurrentLotteryNo" function works correctly:\n');
            await testResultFile.write(`${expectedLotteryNumber} - Expected lottery number\n`);
            await testResultFile.write(`${currentLotteryNo} - Lottery number returned by function\n\n`);
        }
        // View/pure functions do not cost gas, but we can estimate a gas usage using ethers.estimateGas function
        let gasEstimate = await userFacet.getCurrentLotteryNo.estimateGas();
        gasUsages.getCurrentLotteryNo.push(gasEstimate);
        // Save the current lottery number in the buyer object
        buyer.currentLotteryNo = currentLotteryNo;


        // Then, get the current lottery info
        const currentLotteryInfo = await userFacet.connect(buyer.signer).getLotteryInfo(currentLotteryNo);
        const [unixend, nooftickets, noofwinners, minpercentage, ticketprice] = currentLotteryInfo.map((value) => Number(value));
        // Check (once) if getLotteryInfo function works correctly
        if (buyer.id === 1) {
            await testResultFile.write('Check if "getLotteryInfo" function works correctly:\n');
            await testResultFile.write(`${lottery.endTime} - Expected end time\n`);
            await testResultFile.write(`${unixend} - End time returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            await testResultFile.write(`${lottery.ticketsIssued} - Expected number of issued tickets\n`);
            await testResultFile.write(`${nooftickets} - Number of tickets returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            await testResultFile.write(`${lottery.numberOfWinners} - Expected number of winners\n`);
            await testResultFile.write(`${noofwinners} - Number of winners returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            await testResultFile.write(`${lottery.minPercentage} - Expected minimum percentage\n`);
            await testResultFile.write(`${minpercentage} - Minimum percentage returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            await testResultFile.write(`${lottery.ticketPrice} - Expected ticket price\n`);
            await testResultFile.write(`${ticketprice} - Ticket price returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n\n');
        }
        // Estimate gas
        gasEstimate = await userFacet.getLotteryInfo.estimateGas(currentLotteryNo);
        gasUsages.getLotteryInfo.push(gasEstimate);
        // Save the current lottery ticket price in the buyer object
        buyer.currentTicketPrice = ticketprice;


        // Next, get URL of the current lottery
        const currentLotteryURL = await userFacet.connect(buyer.signer).getLotteryURL(currentLotteryNo);
        const [htmlhash, url] = currentLotteryURL;
        // Check (once) if getLotteryURL function works correctly
        if (buyer.id === 1) {
            await testResultFile.write('Check if "getLotteryURL" function works correctly:\n');
            await testResultFile.write(`${lottery.htmlHash} - Expected HTML hash\n`);
            await testResultFile.write(`${htmlhash} - HTML hash returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            await testResultFile.write(`${lottery.url} - Expected URL\n`);
            await testResultFile.write(`${url} - URL returned by function\n`);
            await testResultFile.write('-------------------------------------------------------------\n\n');
        }
        // Estimate gas
        gasEstimate = await userFacet.getLotteryURL.estimateGas(currentLotteryNo);
        gasUsages.getLotteryURL.push(gasEstimate);


        // Get the payment token address of the current lottery
        const paymentTokenAddress = await userFacet.connect(buyer.signer).getPaymentToken(currentLotteryNo);
        // Check (once) if getPaymentToken function works correctly
        if (buyer.id === 1) {
            await testResultFile.write('Check if "getPaymentToken" function works correctly:\n');
            await testResultFile.write(`${expectedPaymentTokenAddress} - Expected payment token address\n`);
            await testResultFile.write(`${paymentTokenAddress} - Address returned by function\n\n`);
        }
        // Estimate gas
        gasEstimate = await userFacet.getPaymentToken.estimateGas(currentLotteryNo);
        gasUsages.getPaymentToken.push(gasEstimate);


        // Using the address and the ABI of the payment token, get the contract object, and connect it to the current buyer
        const paymentTokenABI = await getPaymentTokenABI();
        const paymentToken = await ethers.getContractAt(paymentTokenABI, paymentTokenAddress, buyer.signer);


        // Buyers need lottery tokens to interact with the company lotteries contract. In my LotteryToken contract, I have implemented a buyTokens function that allows buyers to buy 1000 lottery tokens for 1 gwei. Hardhat network automatically gives 10000 ether to each account created. So, buyers have enough ether to buy lottery tokens. As an initial condition, make each buyer buy 1000 lottery tokens.
        tx = await paymentToken.buyTokens(1, { value: ethers.parseUnits("1", "gwei") });
        receipt = await tx.wait();


        // Check the current lottery token balance of the buyer and save it in the object
        const balanceBeforePurchase = await paymentToken.balanceOf(await buyer.signer.getAddress());
        buyer.addToMap(buyer.balanceBeforeLotteryPurchases, currentLotteryNo, balanceBeforePurchase);


        // Save payment token contract in the buyer object
        buyer.currentLotteryToken = paymentToken;

    }

    // Let buyers make ticket purchases
    for (const buyer of buyers.values()) {

        if (buyer.id === 1) {
            await testResultFile.write('Check if "buyTicketTx", "getLotterySales", "getNumPurchaseTxs" and "getIthPurchasedTicketTx"  functions work correctly:\n');
            await testResultFile.write('---------------------------------------------------------------------------------\n');
        }

        // For first test scenario, issued ticket count is 10
        // Make each of the first 10 buyers buy 1 ticket with a single purchase
        const quantity = 1;
        // Calculate amount to be payed
        const amountToPay = quantity * buyer.currentTicketPrice;


        // Make an allowance to the diamond contract for amount to pay
        tx = await buyer.currentLotteryToken.connect(buyer.signer).approve(diamondAddress, amountToPay);
        receipt = await tx.wait();


        // Generate two random numbers, use first one for correct reveal, second one for incorrect reveal
        const randomNumber = ethers.toBigInt(ethers.randomBytes(32));
        const wrongRandomNumber = ethers.toBigInt(ethers.randomBytes(32));
        // Generate hash from the correct random number and the buyer's address
        const randomNumberHash = ethers.keccak256(ethers.solidityPacked(["uint256", "address"], [randomNumber, await buyer.signer.getAddress()]));


        // Call buyTicketTx transaction
        tx = await userFacet.connect(buyer.signer).buyTicketTx(buyer.currentLotteryNo, quantity, randomNumberHash);
        receipt = await tx.wait();
        // Add gas usage to gas usages object
        gasUsages.buyTicketTx.push(receipt.gasUsed);
        // Get startTicketNo from emitted NewPurchaseMade event
        events = await diamond.queryFilter(userFacet.filters.NewPurchaseMade, receipt.blockNumber, receipt.blockNumber);
        const startTicketNo = Number(events[0].args[0]);
        const expectedStartTicketNo = buyer.id;
        // Check if buyTicketTx function works correctly
        await testResultFile.write('buyTicketfx\n');
        await testResultFile.write(`${expectedStartTicketNo} - Expected starting ticket number for the new purchase\n`);
        await testResultFile.write(`${startTicketNo} - Starting ticket number emitted by the function\n`);
        await testResultFile.write('---------------------------------------------------------------------------------\n');


        // Create a new purchase object with the current info
        const newPurchase = new Purchase(buyer, startTicketNo, quantity, randomNumber, wrongRandomNumber, randomNumberHash);
        // Add new purchase oject to the buyer's lottery purchases array for the current lottery
        buyer.addToMap(buyer.lotteryPurchases, buyer.currentLotteryNo, newPurchase);
        // Also, add it to purchases array of the current lottery
        lottery.purchases.push(newPurchase);
        // Also, for each ticket in the purchase, add the purchase object to the ticketPurchases map of the lottery
        for (let ticketNo = startTicketNo; ticketNo < startTicketNo + quantity; ticketNo++) {
            lottery.ticketPurchases.set(ticketNo, newPurchase);
        }
        // Also, add the buyer to the buyers of the current lottery
        lottery.buyers.set(buyer.id, buyer);


        // Check  the current lottery token balance of the buyer and save it
        const balanceAfterPurchase = await buyer.currentLotteryToken.balanceOf(await buyer.signer.getAddress());
        buyer.addToMap(buyer.balanceAfterLotteryPurchases, buyer.currentLotteryNo, balanceAfterPurchase);


        // Get the lottery sales up to now
        const ticketsSold = Number(await userFacet.connect(buyer.signer).getLotterySales(buyer.currentLotteryNo));
        const expectedTicketsSold = startTicketNo;
        // Estimate gas
        gasEstimate = await userFacet.getLotterySales.estimateGas(buyer.currentLotteryNo);
        gasUsages.getLotterySales.push(gasEstimate);
        // Check if getLotterySales function works correctly
        await testResultFile.write('getLotterySales\n');
        await testResultFile.write(`${expectedTicketsSold} - Expected number of sold tickets\n`);
        await testResultFile.write(`${ticketsSold} - Number of sold tickets returned by the function\n`);
        await testResultFile.write('---------------------------------------------------------------------------------\n');


        // Get the numbers of purchase transactions up to now
        const purchasesMade = Number(await userFacet.connect(buyer.signer).getNumPurchaseTxs(buyer.currentLotteryNo));
        const expectedPurchasesMade = ticketsSold;
        // Estimate gas
        gasEstimate = await userFacet.getNumPurchaseTxs.estimateGas(buyer.currentLotteryNo);
        gasUsages.getNumPurchaseTxs.push(gasEstimate);
        // Check if getNumPurchaseTxs function works correctly
        await testResultFile.write('getNumPurchaseTxs\n');
        await testResultFile.write(`${expectedPurchasesMade} - Expected number of purchase transactions\n`);
        await testResultFile.write(`${purchasesMade} - Number of purchase transactions returned by the function\n`);
        await testResultFile.write('---------------------------------------------------------------------------------\n');
        if (purchasesMade == 1) {
            await testResultFile.write('---------------------------------------------------------------------------------\n');
        }


        if (ticketsSold > 1) {
            // Get the purchase transaction info of the previous ticket
            const previousTicketPurchase = await userFacet.connect(buyer.signer).getIthPurchasedTicketTx(ticketsSold - 1, buyer.currentLotteryNo);
            const [previousStartTicketNo, previousQuantity] = previousTicketPurchase.map((value) => Number(value));
            const expectedPSTN = startTicketNo - 1;
            const expectedPQ = quantity;
            // Estimate gas
            gasEstimate = await userFacet.getIthPurchasedTicketTx.estimateGas(ticketsSold - 1, buyer.currentLotteryNo);
            gasUsages.getIthPurchasedTicketTx.push(gasEstimate);
            // Check if getIthPurchasedTicketTx function works correctly
            await testResultFile.write(`getIthPurchasedTicketTx - Get ${ticketsSold - 1}th ticket transaction: \n`);
            await testResultFile.write(`Start ticket:${expectedPSTN} Quantity:${expectedPQ}- Expected values\n`);
            await testResultFile.write(`Start ticket:${previousStartTicketNo} Quantity:${previousQuantity}- Function return values\n`);
            await testResultFile.write('---------------------------------------------------------------------------------\n');
            if (ticketsSold < lottery.ticketsIssued) {
                await testResultFile.write('---------------------------------------------------------------------------------\n');
            }

        }


        // Break out of the loop if all 10 tickets of the lottery are sold
        if (ticketsSold === lottery.ticketsIssued) {
            await testResultFile.write('\n');
            break;
        }

    }


    // Get reveal time of lottery
    lottery.revealTime = Number(await userFacet.getRevealTime(lottery.id));
    // Set the next block timestamp to revealtime+1 (ensure reveal phase started)
    await network.provider.send("evm_setNextBlockTimestamp", [lottery.revealTime + 1]);


    // Let buyers of the lottery to reveal their purchases
    for (const buyer of lottery.buyers.values()) {

        // For each purchase that belongs to the current buyer
        for (const purchase of buyer.lotteryPurchases.get(buyer.currentLotteryNo)) {

            // Reveal the purchase (call revealRndNumberTx transaction). For test 1, reveal all purchases correctly
            tx = await userFacet.connect(buyer.signer).revealRndNumberTx(buyer.currentLotteryNo, purchase.startTicketNo, purchase.quantity, purchase.randomNumber);
            receipt = await tx.wait();
            // Add gas usage to gas usages object
            gasUsages.revealRndNumberTx.push(receipt.gasUsed);
            // Determine the validity of the purchase reveal
            // events = await diamond.queryFilter("*", receipt.blockNumber, receipt.blockNumber);
            const isValid = (receipt.logs[0].fragment.name === "ValidReveal");
            const expectedIsValid = true;
            // Check if revealRndNumberTx function works correctly
            if (buyer.id === 1 && purchase.startTicketNo === 1) {
                await testResultFile.write('Check if "revealRndNumberTx" function works correctly:\n');
            }
            await testResultFile.write(`Reveal for purchase => Start ticket no:${purchase.startTicketNo} Quantity:${purchase.quantity}\n`);
            await testResultFile.write(`${expectedIsValid === true ? 'Valid' : 'Invalid'} - Expected validity of the reveal\n`);
            await testResultFile.write(`${isValid === true ? 'Valid' : 'Invalid'} - Validity of the reveal emitted by transaction\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
            if (purchase.startTicketNo === lottery.ticketsIssued) {
                await testResultFile.write('\n');
            }
        }

    }


    // Set next block time to end time + 1
    await network.provider.send("evm_setNextBlockTimestamp", [lottery.endTime + 1]);


    // Finalize lottery
    tx = await ownershipFacet.connect(owner.signer).finalizeLottery(lottery.id);
    receipt = await tx.wait();
    // Determine if the lottery has been cancelled or not
    // events = await companyLotteries.queryFilter("*", receipt.blockNumber, receipt.blockNumber);
    const isCancelled = (receipt.logs[0].fragment.name === "Cancelled");


    // Get the winning ticket number
    const winningTicket = Number(await userFacet.getIthWinningTicket(lottery.id, lottery.numberOfWinners));
    // Estimate gas
    gasEstimate = await userFacet.getIthWinningTicket.estimateGas(lottery.id, lottery.numberOfWinners);
    gasUsages.getIthWinningTicket.push(gasEstimate);
    // Check if getIthWinningTicket function works correctly
    await testResultFile.write('Check if "getIthWinningTicket" function works correctly:\n');
    await testResultFile.write(`1 < Expected Ticket Number <= 10 - Any valid ticket can be the winning ticket\n`);
    await testResultFile.write(`${winningTicket} - Winning ticket number returned by function\n\n`);
    // Add the winning ticket to the lottery object and to the purchase object it belongs
    lottery.winnerTickets.push(winningTicket);
    lottery.ticketPurchases.get(winningTicket).winnerTickets.push(winningTicket);


    // Let buyers check if their or others' tickets have won
    await testResultFile.write('Check if "checkIfMyTicketWon" and "checkIfAddrTicketWon" functions work correctly:\n');
    for (const buyer of lottery.buyers.values()) {

        if (buyer.id > 1) {
            await testResultFile.write('-------------------------------------------------------------\n');
        }

        // Check if the buyer's ticket has won
        const myTicketWon = await userFacet.connect(buyer.signer).checkIfMyTicketWon(buyer.currentLotteryNo, buyer.id);
        const expectedMyTicketWon = (lottery.winnerTickets.includes(buyer.id));
        // Estimate gas
        gasEstimate = await userFacet.checkIfMyTicketWon.estimateGas(buyer.currentLotteryNo, buyer.id);
        gasUsages.checkIfMyTicketWon.push(gasEstimate);
        // Check if checkIfMyTicketWon function works correctly
        await testResultFile.write(`checkIfMyTicketWon - Buyer ${buyer.id}:\n`);
        await testResultFile.write(`${expectedMyTicketWon} - Expected return value\n`);
        await testResultFile.write(`${myTicketWon} - Return value of the function\n`);

        if (buyer.id < 10) {

            // Check if next buyer's ticket has won
            const nextBuyer = buyers.get(buyer.id + 1);
            const nextTicketWon = await userFacet.connect(buyer.signer).checkIfAddrTicketWon(await nextBuyer.signer.getAddress(), buyer.currentLotteryNo, nextBuyer.id);
            const expectedNextTicketWon = (lottery.winnerTickets.includes(nextBuyer.id));
            // Estimate gas
            gasEstimate = await userFacet.checkIfAddrTicketWon.estimateGas(await nextBuyer.signer.getAddress(), buyer.currentLotteryNo, nextBuyer.id);
            gasUsages.checkIfAddrTicketWon.push(gasEstimate);
            // Check if checkIfAddrTicketWon function works correctly
            await testResultFile.write(`checkIfAddrTicketWon - Buyer ${buyer.id} checks if Buyer ${nextBuyer.id}'s ticket won:\n`);
            await testResultFile.write(`${expectedNextTicketWon} - Expected return value\n`);
            await testResultFile.write(`${nextTicketWon} - Return value of the function\n`);
            await testResultFile.write('-------------------------------------------------------------\n');
        }
        else {
            // Check if first buyer's ticket has won
            const firstBuyer = buyers.get(1);
            const firstTicketWon = await userFacet.connect(buyer.signer).checkIfAddrTicketWon(await firstBuyer.signer.getAddress(), buyer.currentLotteryNo, firstBuyer.id);
            const expectedFirstTicketWon = (lottery.winnerTickets.includes(firstBuyer.id));
            // Estimate gas
            gasEstimate = await userFacet.checkIfAddrTicketWon.estimateGas(await firstBuyer.signer.getAddress(), buyer.currentLotteryNo, firstBuyer.id);
            gasUsages.checkIfAddrTicketWon.push(gasEstimate);
            // Check if checkIfAddrTicketWon function works correctly
            await testResultFile.write(`checkIfAddrTicketWon - Buyer ${buyer.id} checks if Buyer ${firstBuyer.id}'s ticket won:\n`);
            await testResultFile.write(`${expectedFirstTicketWon} - Expected return value\n`);
            await testResultFile.write(`${firstTicketWon} - Return value of the function\n`);
            await testResultFile.write('-------------------------------------------------------------\n\n');

        }


    }


    // Using the address and the ABI of the lottery token, get the contract object, and connect it to the owner
    const lotteryToken = await ethers.getContractAt(await getPaymentTokenABI(), lotteryTokenAddress, owner.signer);


    // Check if withdrawTicketRefund function works correctly
    await testResultFile.write('Check if "withdrawTicketRefund" function works correctly:\n');
    // Get contract's lottery token balance before the refund
    const contractBalanceBeforeRefund = await lotteryToken.balanceOf(diamondAddress);
    // Get winning buyer's lottery token balance before refuns
    const winningBuyer = lottery.ticketPurchases.get(winningTicket).buyer;
    const winningBuyerBalanceBeforeRefund = winningBuyer.balanceAfterLotteryPurchases.get(winningBuyer.currentLotteryNo);
    // Write balances before refund
    await testResultFile.write(`BEFORE REFUND:\n`);
    await testResultFile.write(`Diamond contract balance: ${contractBalanceBeforeRefund}\n`);
    await testResultFile.write(`Buyer ${winningBuyer.id} (winner) balance: ${winningBuyerBalanceBeforeRefund}\n`);
    // Let winning buyer withdraw ticket refund
    tx = await userFacet.connect(winningBuyer.signer).withdrawTicketRefund(winningBuyer.currentLotteryNo, winningTicket);
    receipt = await tx.wait();
    // Add gas usage to gas usages object
    gasUsages.withdrawTicketRefund.push(receipt.gasUsed);
    // Get balances after refund
    const contractBalanceAfterRefund = await lotteryToken.balanceOf(diamondAddress);
    const winningBuyerBalanceAfterRefund = await winningBuyer.currentLotteryToken.balanceOf(await winningBuyer.signer.getAddress());
    // Write balances after refund
    await testResultFile.write(`AFTER REFUND:\n`);
    await testResultFile.write(`Diamond contract balance: ${contractBalanceAfterRefund}\n`);
    await testResultFile.write(`Buyer ${winningBuyer.id} (winner) balance: ${winningBuyerBalanceAfterRefund}\n\n`);


    // Check if withdrawTicketProceeds function works correctly
    await testResultFile.write('Check if "withdrawTicketProceeds" function works correctly:\n');
    // Get contract's lottery token balance before the proceeds withdrawal
    const contractBalanceBeforeProceeds = contractBalanceAfterRefund;
    // Get owner's lottery token balance before proceeds withdrawal
    const balanceBeforeProceeds = await lotteryToken.connect(owner.signer).balanceOf(await owner.signer.getAddress());
    owner.balanceBeforeLotteryProceeds.set(lottery.id, balanceBeforeProceeds);
    // Write balances before proceeds withdrawal
    await testResultFile.write(`BEFORE PROCEEDS:\n`);
    await testResultFile.write(`Diamond contract balance: ${contractBalanceBeforeProceeds}\n`);
    await testResultFile.write(`Owner balance: ${balanceBeforeProceeds}\n`);
    // Let owner withdraw ticket proceeds
    tx = await ownershipFacet.connect(owner.signer).withdrawTicketProceeds(lottery.id);
    receipt = await tx.wait();
    // Add gas usage to gas usages object
    gasUsages.withdrawTicketProceeds.push(receipt.gasUsed);
    // Get balances after proceeds withdrawal
    const contractBalanceAfterProceeds = await lotteryToken.balanceOf(diamondAddress);
    const balanceAfterProceeds = await lotteryToken.connect(owner.signer).balanceOf(await owner.signer.getAddress());
    owner.balanceAfterLotteryProceeds.set(lottery.id, balanceAfterProceeds);
    // Write balances after proceeds withdrawal
    await testResultFile.write(`AFTER PROCEEDS:\n`);
    await testResultFile.write(`Diamond contract balance: ${contractBalanceAfterProceeds}\n`);
    await testResultFile.write(`Owner balance: ${balanceAfterProceeds}\n\n`);


    // Close the test result file
    await testResultFile.close();

    // Add the lottery to lotteries map
    lotteries.set(lottery.id, lottery);


}


async function main() {
    // From the accounts that are created automatically by hardhat, set first one as the owner account and all others as buyer accounts
    const [ownerSigner, ...buyerSigners] = await ethers.getSigners();
    // Also deploy diamond and get return values
    const [owner, facetFactories, diamondAddress, lotteryTokenAddress] = await deployDiamond();
    // Create buyers map to hold buyer objects by buyer id
    const buyers = createBuyersMap(buyerSigners);

    // Create lotteries map to hold lottery objects by lottery number
    const lotteries = new Map();
    // Create gas usages object to hold gas usage data
    const gasUsages = new GasUsages();
    // Create test result directory
    const testResultsDirectory = await createTestResultsDirectory();


    await runFirstLottery(lotteries, owner, buyers, gasUsages, diamondAddress, lotteryTokenAddress, facetFactories, testResultsDirectory);

}

// Hardhat recommends this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// lkk
contract UserFacet {
    // Define custom errors
    error NotEnoughRemainingTickets(uint remainingTickets);
    error InsufficientAllowanceForPurchase(
        uint currentAllowence,
        uint purchaseCost
    );
    error RevealPhaseHasNotStartedYet(
        uint blockTimestamp,
        uint revealStartTimestamp
    );
    error RefundAlreadyWithdrawn(uint earnedAmount, uint withdrawnAmount);

    // Define events
    event InvalidReveal(string message, bytes32 expectedHash);
    event ValidReveal(string message);
    event PaymentMade(uint payedAmount, uint remainingRefund);
    event NewPurchaseMade(uint startTicketNo);

    function getPaymentToken(
        uint lottery_no
    ) external view returns (address erctokenaddr) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if the lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Return the payment token address of the specified lottery
        return address(ds.lotteries[lottery_no].lotteryToken);
    }

    function buyTicketTx(
        uint lottery_no,
        uint quantity,
        bytes32 hash_rnd_number
    ) external returns (uint sticketno) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        // Check if ticket purchase phase is still active
        require(
            block.timestamp < lottery.revealTime,
            "Ticket purchase phase has ended for the lottery."
        );
        // Check if quantity is valid
        require(
            quantity > 0 && quantity <= 30,
            "For a single transaction, quantity must be between 1 and 30."
        );
        // Check if the remaining tickets are sufficient
        uint remainingTickets = lottery.ticketsIssued - lottery.ticketsSold;
        if (quantity > remainingTickets) {
            revert NotEnoughRemainingTickets(remainingTickets);
        }

        // Calculate the required payment for the purchase (in lottery tokens), and get buyer's current allowance
        uint purchaseCost = lottery.ticketPrice * quantity;
        uint buyerAllowence = lottery.lotteryToken.allowance(
            msg.sender,
            address(this)
        );
        // Check if the buyer has allowed enough lottery tokens to the contract for the purchase
        if (buyerAllowence < purchaseCost) {
            revert InsufficientAllowanceForPurchase(
                buyerAllowence,
                purchaseCost
            );
        }

        // If the allowance is sufficient, transfer the tokens from the buyer to the contract
        bool isTransferSuccessful = lottery.lotteryToken.transferFrom(
            msg.sender,
            address(this),
            purchaseCost
        );
        require(
            isTransferSuccessful == true,
            "Can't make purchase, lottery token transfer failed."
        );

        // If transfer is successful, create a new purchase object and push it to the purchase array of the lottery
        uint startTicketNo = lottery.ticketsSold + 1;
        LibDiamond.Purchase memory newPurchase = LibDiamond.Purchase({
            buyer: msg.sender,
            startTicketNo: startTicketNo,
            quantity: quantity,
            hashRandomNumber: hash_rnd_number,
            randomNumber: 0,
            isRevealed: false,
            isRevealValid: false,
            earnedRefund: 0,
            withdrawnRefund: 0,
            won: false
        });
        ds.lotteryPurchases[lottery_no].push(newPurchase);

        // Update the number of tickets sold for the lottery
        lottery.ticketsSold += quantity;

        // Emit an event for the new purchase
        emit NewPurchaseMade(startTicketNo);
        // Return the starting ticket number of the purchase
        return startTicketNo;
    }

    function revealRndNumberTx(
        uint lottery_no,
        uint sticketno,
        uint quantity,
        uint rnd_number
    ) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the lottery is in the reveal phase
        if (block.timestamp < lottery.revealTime) {
            revert RevealPhaseHasNotStartedYet(
                block.timestamp,
                lottery.revealTime
            );
        }
        require(
            block.timestamp <= lottery.endTime,
            "Lottery has already ended, cannot reveal anymore."
        );

        // Check if quantity is valid
        require(
            quantity > 0 && quantity <= 30,
            "Quantity must be between 1 and 30."
        );
        // Check if ticket number range is valid
        require(
            sticketno > 0 && sticketno + quantity - 1 <= lottery.ticketsSold,
            "Invalid ticket range."
        );

        // Create variables for finding the purchase object with the provided info
        LibDiamond.Purchase[] storage currentLotteryPurchases = ds
            .lotteryPurchases[lottery_no];

        bool found = false;
        uint foundIndex;
        // Check purchases one by one for the current lottery
        for (uint i = 0; i < currentLotteryPurchases.length; i++) {
            // Get current purchase
            LibDiamond.Purchase
                storage currentPurchase = currentLotteryPurchases[i];

            if (
                currentPurchase.buyer == msg.sender && // If buyer is the message sender
                sticketno == currentPurchase.startTicketNo && // If starting ticket number matches
                quantity == currentPurchase.quantity && // If quantity matches
                currentPurchase.isRevealed == false // If the purchase is not already revealed
            ) {
                // Then, we found the matching purchase for revealing
                found = true;
                foundIndex = i;
                break;
            }
        }
        // Check if a matching purchase could be found
        require(
            found == true,
            "No matching purchase is found with the provided information."
        );

        // Get purchase at the found index
        LibDiamond.Purchase storage purchaseToReveal = currentLotteryPurchases[
            foundIndex
        ];
        // Assert purchase is not revealed yet
        assert(purchaseToReveal.isRevealed == false);

        // Recompute the hash using buyer address and provided random number
        purchaseToReveal.randomNumber = rnd_number;
        bytes32 recomputedHash = keccak256(
            abi.encodePacked(rnd_number, msg.sender)
        );

        // If the hashes don't match
        if (purchaseToReveal.hashRandomNumber != recomputedHash) {
            // Mark as an invalid reveal
            purchaseToReveal.isRevealed = true;
            purchaseToReveal.isRevealValid = false;

            // Add whole revenue generated by this purchase to the revenue from invalid reveals
            lottery.invalidRevealRevenue +=
                purchaseToReveal.quantity *
                lottery.ticketPrice;

            // Emit an invalid reveal event
            emit InvalidReveal(
                "Provided random number doesn't produce the correct hash. Winning chance is lost, and there will be no refund.",
                purchaseToReveal.hashRandomNumber
            );
        }
        // If the hashes match
        else {
            // Mark as a valid reveal
            purchaseToReveal.isRevealed = true;
            purchaseToReveal.isRevealValid = true;

            // Update lottery related lottery info
            lottery.validRevealCount++;
            lottery.validRevealRevenue +=
                purchaseToReveal.quantity *
                lottery.ticketPrice;

            // Emit a valid reveal event
            emit ValidReveal(
                "Successfully revealed the random number and obtained a chance at winning."
            );
        }
    }

    function getNumPurchaseTxs(
        uint lottery_no
    ) external view returns (uint numpurchasetxs) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Return the number of purchases for the specified lottery
        return ds.lotteryPurchases[lottery_no].length;
    }

    function getIthPurchasedTicketTx(
        uint i,
        uint lottery_no
    ) external view returns (uint sticketno, uint quantity) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Check if provided purchase number is valid
        require(
            i >= 1 && i <= ds.lotteryPurchases[lottery_no].length,
            "Invalid purchase number."
        );
        // Get the purchase object at the specified number (1 + array index)
        LibDiamond.Purchase storage purchase = ds.lotteryPurchases[lottery_no][
            i - 1
        ];
        // Return the starting ticket number and quantity of the purchase
        return (purchase.startTicketNo, purchase.quantity);
    }

    function checkIfMyTicketWon(
        uint lottery_no,
        uint ticket_no
    ) external view returns (bool won) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Check if the lottery has ended
        require(
            block.timestamp > lottery.endTime,
            "Lottery has not ended yet."
        );

        // Check if the lottery is finalized, if not, finalize it
        require(
            lottery.isFinalized == true,
            "Lottery is not finalized yet. Please try again later."
        );

        // Check if the lottery is cancelled
        require(
            lottery.isCancelled == false,
            "Lottery is cancelled. Ticket purchases are refunded."
        );

        // Check if the ticket number is in the list of winning tickets
        uint[] storage winnerTickets = ds.lotteryWinnerTickets[lottery_no];

        for (uint i = 0; i < winnerTickets.length; i++) {
            // If provided ticket number is in the winning tickets list, ticket won
            if (winnerTickets[i] == ticket_no) {
                return true;
            }
        }

        // If it couldn't be found in the list, ticket hasn't won
        return false;
    }

    function checkIfAddrTicketWon(
        address addr,
        uint lottery_no,
        uint ticket_no
    ) external view returns (bool won) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Check if the lottery has ended
        require(
            block.timestamp > lottery.endTime,
            "Lottery has not ended yet."
        );

        // Check if the lottery is finalized, if not, finalize it
        require(
            lottery.isFinalized == true,
            "Lottery is not finalized yet. Please try again later."
        );

        // Check if the lottery is cancelled
        require(
            lottery.isCancelled == false,
            "Lottery is cancelled. Ticket purchases are refunded."
        );

        // Check if the ticket number is in the list of winning tickets
        uint[] storage winnerTickets = ds.lotteryWinnerTickets[lottery_no];
        uint[] storage winnerPurchaseIndices = ds.lotteryWinnerPurchaseIndices[
            lottery_no
        ];

        // Check each winning ticket
        for (uint i = 0; i < winnerTickets.length; i++) {
            // If provided ticket number is in the winning tickets list
            if (winnerTickets[i] == ticket_no) {
                // Get the purchase index of the winning ticket
                uint winnerPurhcaseIndex = winnerPurchaseIndices[i];
                // Get the winning purchase
                LibDiamond.Purchase storage winnerPurchase = ds
                    .lotteryPurchases[lottery_no][winnerPurhcaseIndex];

                // Check if the provided address is same to the ticket buyer
                if (winnerPurchase.buyer == addr) {
                    return true;
                }
            }
        }

        // If it couldn't be found in the list, ticket hasn't won
        return false;
    }

    function getIthWinningTicket(
        uint lottery_no,
        uint i
    ) external view returns (uint ticketno) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Check if the lottery has ended
        require(
            block.timestamp > lottery.endTime,
            "Lottery has not ended yet."
        );

        // Check if the lottery is finalized, if not, finalize it
        require(
            lottery.isFinalized == true,
            "Lottery is not finalized yet. Please try again later."
        );

        // Check if the lottery is cancelled
        require(
            lottery.isCancelled == false,
            "Lottery is cancelled. Ticket purchases are refunded."
        );

        // Check if provided winner number is valid
        require(
            i >= 1 && i <= ds.lotteries[lottery_no].numberOfWinners,
            "Invalid winner number."
        );
        // Return the winner ticket number at the specified i (1 + array index)
        return ds.lotteryWinnerTickets[lottery_no][i - 1];
    }

    function withdrawTicketRefund(uint lottery_no, uint sticket_no) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Check if the lottery has ended
        require(
            block.timestamp > lottery.endTime,
            "Lottery has not ended yet."
        );

        // Check if the lottery is finalized, if not, finalize it
        require(
            lottery.isFinalized == true,
            "Lottery is not finalized yet. Please try again later."
        );

        // Find the purchase with the provided starting ticket number
        LibDiamond.Purchase[] storage purchases = ds.lotteryPurchases[
            lottery_no
        ];
        bool found = false;
        uint foundIndex;

        for (uint i = 0; i < purchases.length; i++) {
            LibDiamond.Purchase storage currentPurchase = purchases[i];

            if (currentPurchase.startTicketNo == sticket_no) {
                require(
                    currentPurchase.buyer == msg.sender,
                    "This ticket purchase doesn't belong to you."
                );
                require(
                    currentPurchase.isRevealValid == true,
                    "No refund for unrevealed or incorrectly revealed purchases."
                );
                require(
                    currentPurchase.earnedRefund > 0,
                    "No refund earned for this purchase."
                );

                found = true;
                foundIndex = i;
                break;
            }
        }

        // Check if a matching purchase could be found
        require(found == true, "No such ticket purchase for the lottery.");

        LibDiamond.Purchase storage purchaseToPay = purchases[foundIndex];

        if (purchaseToPay.withdrawnRefund < purchaseToPay.earnedRefund) {
            // Calculate amount to pay
            uint amountToPay = purchaseToPay.earnedRefund -
                purchaseToPay.withdrawnRefund;

            // Ensure the contract has enough lottery tokens to pay
            assert(
                lottery.lotteryToken.balanceOf(address(this)) >= amountToPay
            );

            // Increase the withdrawn refund amount of the purchase
            purchaseToPay.withdrawnRefund += amountToPay;

            // Transfer the amount to the buyer
            bool isTransferSuccessful = lottery.lotteryToken.transfer(
                purchaseToPay.buyer,
                amountToPay
            );
            require(
                isTransferSuccessful == true,
                "Can't withdraw refund, lottery token transfer failed."
            );

            emit PaymentMade(amountToPay, 0);
        } else {
            revert RefundAlreadyWithdrawn(
                purchaseToPay.earnedRefund,
                purchaseToPay.withdrawnRefund
            );
        }
    }

    function getCurrentLotteryNo() external view returns (uint lottery_no) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        require(ds.currentLotteryNo > 0, "No lottery has been created yet.");
        // Return the current lottery number
        return ds.currentLotteryNo;
    }

    function getLotteryInfo(
        uint lottery_no
    )
        external
        view
        returns (
            uint unixend,
            uint nooftickets,
            uint noofwinners,
            uint minpercentage,
            uint ticketprice
        )
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Get the lottery object
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        // Return the lottery info
        return (
            lottery.endTime,
            lottery.ticketsIssued,
            lottery.numberOfWinners,
            lottery.minPercentage,
            lottery.ticketPrice
        );
    }

    function getLotteryURL(
        uint lottery_no
    ) external view returns (bytes32 htmlhash, string memory url) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Get the lottery object
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        // Return the html hash and URL of the lottery
        return (lottery.htmlHash, lottery.url);
    }

    function getLotterySales(
        uint lottery_no
    ) external view returns (uint numsold) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Get the lottery object
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        // Return the number of tickets sold for the lottery
        return lottery.ticketsSold;
    }

    function getRevealTime(
        uint lottery_no
    ) external view returns (uint revealtime) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if provided lottery number is valid
        require(
            lottery_no > 0 && lottery_no <= ds.currentLotteryNo,
            "Invalid lottery number."
        );
        // Get the lottery object
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        // Return the reveal time of the lottery
        return lottery.revealTime;
    }
}

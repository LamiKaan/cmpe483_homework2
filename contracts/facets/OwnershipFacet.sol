// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// lkk
contract OwnershipFacet is IERC173 {
    // Define events
    event NewLotteryCreated(uint newLotteryNumber);
    event PaymentTokenSet(address tokenAddress);
    event Finalized(uint lottery_no);
    event Cancelled(uint lottery_no);
    event NoProfitFromLottery(uint lottery_no, uint profit);

    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    function createLottery(
        uint unixend,
        uint nooftickets,
        uint noofwinners,
        uint minpercentage,
        uint ticketprice,
        bytes32 htmlhash,
        string memory url
    ) external returns (uint lottery_no) {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Increment lottery counter
        ds.currentLotteryNo++;

        // Lottery end time must be set as a time in the future
        require(
            unixend > block.timestamp,
            "Lottery end time must be in the future."
        );
        uint revealTimestamp = (unixend + block.timestamp) / 2; // Set reveal time to be halfway between current time and end time
        // Number of issued tickets must be greater than 0
        require(
            nooftickets > 0,
            "Number of issued tickets must be greater than 0."
        );
        // Percentage must be between 1 and 100
        require(
            minpercentage > 0 && minpercentage <= 100,
            "Minimum percentage must be between 1 and 100."
        );
        // Ticket price must be greater than 0
        require(ticketprice > 0, "Ticket price must be greater than 0.");
        // Calculate the minimum required number of tickets to be sold for the lottery to take place
        // Solidity floors (rounds down) the result of division by default, so add 99 to the numerator to obtain ceiled (rounded up) number
        // Rounding up is selected to guarentee that the minimum number is always at least 1 (in case rounding down would result in 0)
        uint minValidSold = (nooftickets * minpercentage + 99) / 100;
        require(
            noofwinners <= minValidSold,
            "Number of winners cannot exceed the minimum number of required tickets that need to be sold for a valid lottery."
        );

        // Initialize a new lottery struct with the provided parameters
        ds.lotteries[ds.currentLotteryNo] = LibDiamond.Lottery(
            unixend,
            revealTimestamp,
            nooftickets,
            minpercentage,
            minValidSold,
            0, // ticketsSold starts at 0
            ticketprice,
            noofwinners,
            htmlhash,
            url,
            false, // isFinalized is false at lottery creation
            false, // isCancelled is false at lottery creation
            ds.paymentToken,
            0, // validRevealCount starts at 0
            0, // invalidRevealRevenue starts at 0
            0, // validRevealRevenue starts at 0
            0, // totalPrize starts at 0
            0, // refundedAmount starts at 0
            0, // ticketProceeds starts at 0
            false // profitWithdrawn starts at false
        );

        // Emit event and return the lottery number
        emit NewLotteryCreated(ds.currentLotteryNo);
        return ds.currentLotteryNo;
    }

    function setPaymentToken(address erctokenaddr) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Check if the address provided is a valid contract address
        require(
            erctokenaddr != address(0),
            "Invalid address for the payment token."
        );
        // Set payment token of the contract to the provided address
        ds.paymentToken = IERC20(erctokenaddr);
        // Emit event for setting payment token
        emit PaymentTokenSet(erctokenaddr);
    }

    function finalizeLottery(uint lottery_no) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get the lottery object
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];

        if (
            lottery.ticketsSold < lottery.minRequiredSold || // If not enough tickets are sold, or
            lottery.validRevealCount < lottery.numberOfWinners
        ) /* If not enough valid reveals are made */ {
            // Cancel the lottery
            cancelLottery(lottery_no);
            // Assert the lottery is cancelled
            assert(lottery.isCancelled == true);

            emit Cancelled(lottery_no);
        }
        // If there are enough ticket sales and valid reveals
        else {
            // Detect winners and disburse refunds
            detectWinnersAndDisburseRefunds(lottery_no);

            // Assert the lottery is finalized
            assert(lottery.isFinalized == true);

            emit Finalized(lottery_no);
        }
    }

    function withdrawTicketProceeds(uint lottery_no) external {
        LibDiamond.enforceIsContractOwner();
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
        if (lottery.isFinalized == false) {
            this.finalizeLottery(lottery_no);
        }
        assert(lottery.isFinalized == true);

        // Check if the profits are not withdrawn yet
        require(
            lottery.profitWithdrawn == false,
            "Ticket proceeds are already withdrawn."
        );

        // Amount to be withdrawn
        uint amountToWithdraw;

        if (lottery.isCancelled == true) {
            // If the lottery is cancelled, there are no ticket proceeds but the owner can still
            // withdraw the revenue generated by invalid reveals which are not refunded
            amountToWithdraw = lottery.invalidRevealRevenue;
        } else {
            // If lottery is finalized normally, owner's profit also includes the ticket proceeds
            amountToWithdraw +=
                lottery.ticketProceeds +
                lottery.invalidRevealRevenue;
        }

        // If amount equals 0, emit event and return
        if (amountToWithdraw == 0) {
            emit NoProfitFromLottery(lottery_no, 0);
            return;
        }

        // Ensure the contract has enough lottery tokens to pay
        assert(
            lottery.lotteryToken.balanceOf(address(this)) >= amountToWithdraw
        );

        // Mark the profits as withdrawn
        lottery.profitWithdrawn = true;

        // Transfer the amount to the owner
        bool isTransferSuccessful = lottery.lotteryToken.transfer(
            ds.contractOwner,
            amountToWithdraw
        );
        require(
            isTransferSuccessful == true,
            "Can't withdraw proceeds, lottery token transfer failed."
        );
    }

    function cancelLottery(uint lottery_no) internal {
        // LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get the lottery object and purchase array
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        LibDiamond.Purchase[] storage purchases = ds.lotteryPurchases[
            lottery_no
        ];
        // // Get initial number of valid reveals (for verifying correct execution with assert)
        uint remainingValidReveals = lottery.validRevealCount;

        // Check every purchase in the purchases array
        for (uint i = 0; i < purchases.length; i++) {
            LibDiamond.Purchase storage purchase = purchases[i];

            // If purchase if revealed validly
            if (purchase.isRevealed && purchase.isRevealValid) {
                // Calculate cost of the purchase
                uint purchaseCost = purchase.quantity * lottery.ticketPrice;

                // Refund the purchase cost to the buyer
                purchase.earnedRefund += purchaseCost;

                // Decrement the remaining valid reveals
                remainingValidReveals--;
                // Increment the refund amount of lottery
                lottery.refundedAmount += purchaseCost;
            }
        }

        // Remaining valid reveals should be zero
        assert(remainingValidReveals == 0);
        // Refund amount should be equal to the initial valid reveal revenue
        assert(lottery.refundedAmount == lottery.validRevealRevenue);

        // Mark the lottery as finalized and cancelled
        lottery.isFinalized = true;
        lottery.isCancelled = true;
    }

    function detectWinnersAndDisburseRefunds(uint lottery_no) internal {
        // LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get the lottery object, purchase array and winner tickets array
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        LibDiamond.Purchase[] storage purchases = ds.lotteryPurchases[
            lottery_no
        ];
        uint[] storage winnerTickets = ds.lotteryWinnerTickets[lottery_no];
        uint[] storage winnerPurchaseIndices = ds.lotteryWinnerPurchaseIndices[
            lottery_no
        ];

        // Set total prize to the 90% of the valid reveal revenue, and keep other 10% as ticket profits
        lottery.totalPrize = (lottery.validRevealRevenue * 9) / 10;
        lottery.ticketProceeds =
            lottery.validRevealRevenue -
            lottery.totalPrize;

        // Initialize the variable for keeping the XOR of random numbers
        uint aggregatedRandomNumber = 0;
        // Initialize variable for keeping the number of valid purchases whose random numbers are used in the XOR
        uint traversedValidCount = 0;
        // Index of the next purchase to be checked
        uint nextPurchaseIndex = 0;

        // For each winner of lottery
        for (uint i = 0; i < lottery.numberOfWinners; i++) {
            // Number of undetected (not found yet) winners
            uint undetectedWinnerCount = lottery.numberOfWinners -
                winnerTickets.length;

            // Assert undetected winner count is positive
            assert(undetectedWinnerCount > 0);
            // Assert that remaning number of winners is consistent with for loop index (we've really detected a new winner for each iteration)
            assert(lottery.numberOfWinners - i == undetectedWinnerCount);

            // Subtract already refunded amount from the total prize of the lottery to find the remaning prize money to be distributed among the remaining winners
            uint remainingPrize = lottery.totalPrize - lottery.refundedAmount;
            // Next winner prize will be an equal share of the remaning amount among the remaining winners
            uint nextWinnerPrize = remainingPrize / undetectedWinnerCount;
            // Assert conditions
            assert(remainingPrize >= nextWinnerPrize && nextWinnerPrize > 0);

            // Traverse purchases, make sure to leave enough unchecked valid purchases to find next winners
            while (
                traversedValidCount <
                lottery.validRevealCount - undetectedWinnerCount + 1
            ) {
                // Assert that purchase index remains in bounds
                assert(nextPurchaseIndex < purchases.length);
                // Get next purchase to check
                LibDiamond.Purchase storage purchase = purchases[
                    nextPurchaseIndex
                ];

                // If the purchase is invalid, move to the next purchase
                if (purchase.isRevealValid == false) {
                    nextPurchaseIndex++;
                    continue;
                }
                // If the purchase is valid
                else {
                    // Update the aggregated random number by doing XOR with the random number of the purchase
                    aggregatedRandomNumber ^= purchase.randomNumber;
                    // Increment the number of traversed valid purchases
                    traversedValidCount++;
                    // Update the next purchase index
                    nextPurchaseIndex++;
                }
            }

            // Assert that traversed valid count remains in bounds
            assert(traversedValidCount <= lottery.validRevealCount);
            // Calculate (aggregate random number) modulo (tickets sold)
            uint nextWinnerMod = aggregatedRandomNumber % lottery.ticketsSold;
            // Find the next winner ticket using the modulus result
            (
                uint nextWinnerTicket,
                uint nextWinnerPurchaseIndex
            ) = detectNextWinner(lottery_no, nextWinnerMod);

            // Add the next winner ticket to the winner tickets array
            winnerTickets.push(nextWinnerTicket);
            // Add the next winner purchase index to the winner purchase indices array
            winnerPurchaseIndices.push(nextWinnerPurchaseIndex);
            // Assert length of two arrays are equal
            assert(winnerTickets.length == winnerPurchaseIndices.length);

            // Get the winner purchase
            LibDiamond.Purchase storage winnerPurchase = purchases[
                nextWinnerPurchaseIndex
            ];
            // Assert it's a valid purchase
            assert(winnerPurchase.isRevealValid == true);
            // Add won prize as an earned refund
            winnerPurchase.earnedRefund += nextWinnerPrize;
            // Mark purchase as a winner
            winnerPurchase.won = true;

            // Increment refunded amount of lottery by the given prize
            lottery.refundedAmount += nextWinnerPrize;
            // Assert amounts are consistent
            assert(lottery.totalPrize >= lottery.refundedAmount);
        }

        // Once all winners are found, all valid purchases should be traversed
        assert(traversedValidCount == lottery.validRevealCount);
        // All prize should be refunded, so refunded prize + profits should equal initial revenue
        assert(
            lottery.refundedAmount + lottery.ticketProceeds ==
                lottery.validRevealRevenue
        );
        // Also, assert winning ticket count one last time
        assert(
            winnerTickets.length == winnerPurchaseIndices.length &&
                winnerTickets.length == lottery.numberOfWinners
        );

        // Mark the lottery as finalized
        lottery.isFinalized = true;
    }

    function detectNextWinner(
        uint lottery_no,
        uint nextWinnerMod
    )
        internal
        view
        returns (uint nextWinnerTicket, uint nextWinnerPurchaseIndex)
    {
        // LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get the lottery object and purchase array
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        LibDiamond.Purchase[] storage purchases = ds.lotteryPurchases[
            lottery_no
        ];
        // Get the winner tickets array
        uint[] storage winnerTickets = ds.lotteryWinnerTickets[lottery_no];
        // Get the winner purchase indices array
        uint[] storage winnerPurchaseIndices = ds.lotteryWinnerPurchaseIndices[
            lottery_no
        ];

        // Remaining mod to be consumed while checking tickets, initially set from function input
        uint remainingMod = nextWinnerMod;

        // Declare variables for currently checked ticket
        uint currentTicketNo;
        uint currentPurchaseIndex;

        // Declare variable for the closest previously won ticket, to the right of the currently checked ticket
        uint closestWonTicketToTheRight;

        // Assert that there are still winners to be found
        assert(winnerTickets.length < lottery.numberOfWinners);

        // If this is the first winner to be found
        if (winnerTickets.length == 0) {
            // Assert also winner purchase indices array's length is 0
            assert(winnerPurchaseIndices.length == 0);
            // Set the current ticket to first ticket (ticket number 1) and purchase index to 0
            currentTicketNo = 1;
            currentPurchaseIndex = 0;

            // // If first purchase is a valid purchase
            // if (purchases[currentPurchaseIndex].isRevealValid == true) {
            //     // Decrease remaining mod by 1
            //     remainingMod--;
            // }

            // Set closest won ticket to the right to 0 (as ticket numbers start from 1, it indicates no winner)
            closestWonTicketToTheRight = 0;
        }
        // If there are previous winners
        else {
            // Assert winner tickets and winner purchase arrays have the same length
            assert(winnerTickets.length == winnerPurchaseIndices.length);
            // Set current ticket to the last winner ticket (start checking from last winner)
            currentTicketNo = winnerTickets[winnerTickets.length - 1];
            currentPurchaseIndex = winnerPurchaseIndices[
                winnerTickets.length - 1
            ];

            // Find the closest won ticket to the right of the current ticket
            closestWonTicketToTheRight = findClosestWonTicketToTheRight(
                lottery_no,
                currentTicketNo
            );
        }

        // Loop until next winner is found
        while (true) {
            // Make sure current ticket number is in bounds (1 to tickets sold)
            if (currentTicketNo > lottery.ticketsSold) {
                // If not, wrap around to the beginning
                currentTicketNo %= lottery.ticketsSold;
            }
            // Also, make sure current purchase index is in bounds (0 to purchases length - 1)
            currentPurchaseIndex %= purchases.length;

            // Assert conditions
            assert(
                currentTicketNo > 0 && currentTicketNo <= lottery.ticketsSold
            );
            assert(
                currentPurchaseIndex >= 0 &&
                    currentPurchaseIndex < purchases.length
            );

            // Get current purchase
            LibDiamond.Purchase storage currentPurchase = purchases[
                currentPurchaseIndex
            ];

            // If the current purchase is an invalid purchase
            if (currentPurchase.isRevealValid == false) {
                // Set ticket no to the first (starting) ticket of the next purchase (without consuming any remaning mod, as it's an invalid purchase)
                currentTicketNo =
                    currentPurchase.startTicketNo +
                    currentPurchase.quantity;
                // Also, move purchase index to the next purchase
                currentPurchaseIndex++;

                // Make sure values are between valid bounds
                if (currentTicketNo > lottery.ticketsSold) {
                    currentTicketNo %= lottery.ticketsSold;
                }
                currentPurchaseIndex %= purchases.length;

                // Assert new condition
                assert(
                    purchases[currentPurchaseIndex].startTicketNo ==
                        currentTicketNo
                );

                // And continue to the next iteration
                continue;
            }
            // If the current purchase is a valid purchase
            else {
                // If currently checked ticket is the same with the closest won ticket to the right
                if (currentTicketNo == closestWonTicketToTheRight) {
                    // Find a (possibly) new closest won ticket to the right
                    uint newClosestWonTicketToTheRight = findClosestWonTicketToTheRight(
                            lottery_no,
                            currentTicketNo
                        );

                    // If the old closest won ticket(=currently checked ticket) is the last ticket of the current purchase
                    if (
                        currentTicketNo ==
                        currentPurchase.startTicketNo +
                            currentPurchase.quantity -
                            1
                    ) {
                        // Move to the starting ticket of the next purchase and update purchase index without consuming any remaining mod (as we're on a ticket that's already a winner)
                        currentTicketNo =
                            currentPurchase.startTicketNo +
                            currentPurchase.quantity;
                        // Also, move purchase index to the next purchase
                        currentPurchaseIndex++;

                        // Make sure values are between valid bounds
                        if (currentTicketNo > lottery.ticketsSold) {
                            currentTicketNo %= lottery.ticketsSold;
                        }
                        currentPurchaseIndex %= purchases.length;

                        // Assert new condition
                        assert(
                            purchases[currentPurchaseIndex].startTicketNo ==
                                currentTicketNo
                        );
                    }
                    // If the old closest won ticket(=currently checked ticket) is NOT the last ticket of the current purchase
                    else {
                        // Move to the next ticket in the current purchase (again without consuming any remaining mod)
                        currentTicketNo++;

                        // Make sure values are between valid bounds
                        if (currentTicketNo > lottery.ticketsSold) {
                            currentTicketNo %= lottery.ticketsSold;
                        }
                        currentPurchaseIndex %= purchases.length;

                        // Assert that ticket is in bounds of the purchase
                        assert(
                            currentTicketNo >= currentPurchase.startTicketNo &&
                                currentTicketNo <
                                currentPurchase.startTicketNo +
                                    currentPurchase.quantity
                        );
                    }

                    // Update the closest won ticket to the right
                    closestWonTicketToTheRight = newClosestWonTicketToTheRight;

                    // And continue to the next iteration
                    continue;
                }
                // If currently checked ticket is not the same with the closest won ticket to the right (it's not a previously won ticket)
                else {
                    // If remaining mod is 0, we found the next winner
                    if (remainingMod == 0) {
                        // Assert that ticket is in bounds of the purchase
                        assert(
                            currentTicketNo >= currentPurchase.startTicketNo &&
                                currentTicketNo <
                                currentPurchase.startTicketNo +
                                    currentPurchase.quantity
                        );
                        // Return the ticket number and purchase index of the winner
                        return (currentTicketNo, currentPurchaseIndex);
                    }
                    // If remaining mod is not 0
                    else {
                        // If currently checked ticket is the last ticket of the current purchase
                        if (
                            currentTicketNo ==
                            currentPurchase.startTicketNo +
                                currentPurchase.quantity -
                                1
                        ) {
                            // Move to the starting ticket of the next purchase and update purchase index without consuming any remaining mod (as we're on a ticket that's already a winner)
                            currentTicketNo =
                                currentPurchase.startTicketNo +
                                currentPurchase.quantity;
                            // Also, move purchase index to the next purchase
                            currentPurchaseIndex++;

                            // Decrease remaining mod by 1
                            remainingMod--;

                            // Make sure values are between valid bounds
                            if (currentTicketNo > lottery.ticketsSold) {
                                currentTicketNo %= lottery.ticketsSold;
                            }
                            currentPurchaseIndex %= purchases.length;

                            // Assert new condition
                            assert(
                                purchases[currentPurchaseIndex].startTicketNo ==
                                    currentTicketNo
                            );

                            // And continue to the next iteration
                            continue;
                        }
                        // If currently checked ticket is not the last ticket of the current purchase
                        else {
                            // From the current ticket, calculate the distances to the 1) closest won ticket to the right 2) to the purchase end, and compare with the 3) remaning mod
                            uint distance1 = closestWonTicketToTheRight >
                                currentTicketNo
                                ? closestWonTicketToTheRight - currentTicketNo
                                : closestWonTicketToTheRight +
                                    lottery.ticketsSold -
                                    currentTicketNo;
                            uint distance2 = currentPurchase.startTicketNo +
                                currentPurchase.quantity -
                                currentTicketNo -
                                1;
                            // Find the minimum of those 3 values
                            uint min1 = distance1 < distance2
                                ? distance1
                                : distance2;
                            uint min2 = min1 < remainingMod
                                ? min1
                                : remainingMod;

                            // Move the current ticket by this minimum distance (currentPurchaseIndex is not modified. As we move at most to the purchase end, the ticket is guaranteed to stay in the same purchase.)
                            currentTicketNo += min2;
                            // Decrease remaining mod by the same amount
                            remainingMod -= min2;

                            // Make sure values are between valid bounds (after moving, new ticket number should stay in the same purchase)
                            assert(
                                currentTicketNo >=
                                    currentPurchase.startTicketNo &&
                                    currentTicketNo <
                                    currentPurchase.startTicketNo +
                                        currentPurchase.quantity
                            );

                            // Continue to the next iteration
                            continue;
                        }
                    }
                }
            }
        }
    }

    function findClosestWonTicketToTheRight(
        uint lottery_no,
        uint ticket_no
    ) internal view returns (uint closestWonTicket) {
        // LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get the lottery object and purchase array
        LibDiamond.Lottery storage lottery = ds.lotteries[lottery_no];
        // Get the winner tickets array
        uint[] storage winnerTickets = ds.lotteryWinnerTickets[lottery_no];

        // Declare closest ticket no and distance (initialized as tickets sold = maximum distance)
        closestWonTicket = 0;
        uint closestDistance = lottery.ticketsSold;

        // For each winner ticket
        for (uint i = 0; i < winnerTickets.length; i++) {
            // Get winner ticket no
            uint winnerTicketNo = winnerTickets[i];
            uint currentDistance;

            // If winner ticket no is bigger (is really to the right)
            if (ticket_no > winnerTicketNo) {
                // Calculate distance to the winner
                currentDistance = ticket_no - winnerTicketNo;
            }
            // If winner ticket no is smaller or equal (same or to the left)
            else {
                // Still calculate positive distance from the right
                currentDistance =
                    winnerTicketNo +
                    lottery.ticketsSold -
                    ticket_no;
            }

            // If a smaller distance is found, update the closest ticket
            if (currentDistance <= closestDistance) {
                closestWonTicket = winnerTicketNo;
                closestDistance = currentDistance;
            }
        }

        // Return the closest won ticket to the right of provided ticket
        return closestWonTicket;
    }
}

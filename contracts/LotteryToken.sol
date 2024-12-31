// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// lkk
contract LotteryToken is ERC20 {
    address payable public owner; // Contract owner address
    uint public exchangeRate; // Number of lottery tokens that can be purchased with 1 gwei

    constructor() ERC20("LotteryToken", "LT") {
        owner = payable(msg.sender); // Set the owner as the contract deployer
        exchangeRate = 1000; // Set the exchange rate (1000 lottery tokens per 1 gwei)
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "This function can only be called by the contract owner."
        );
        _;
    }

    // Function to allow users to buy LotteryTokens with ether
    function buyTokens(uint256 gweiAmount) external payable {
        require(gweiAmount > 0, "Amount(in gwei) must be greater than 0.");
        // Convert gwei amount to wei
        uint256 weiAmount = gweiAmount * 10 ** 9;
        require(
            msg.value == weiAmount,
            "Ethers sent don't match the specified gwei amount."
        );

        uint tokenAmount = gweiAmount * exchangeRate; // Calculate the token amount to mint
        _mint(msg.sender, tokenAmount); // Mint the tokens to the buyer's account
    }

    // Function for owner to withdraw the ether collected by the contract in exchange for tokens
    function withdrawCollection() external onlyOwner {
        owner.transfer(address(this).balance); // Transfer whole balance to the owner
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMilestoneToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

contract MilestonePool is ReentrancyGuard {
    address public immutable factory;
    address public immutable creator;
    uint256 public immutable deadline;
    IMilestoneToken public immutable token;

    uint256 public totalYes;
    uint256 public totalNo;

    bool public isResolved;
    bool public outcome;
    uint256 public rewardTokenBalance;

    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;
    mapping(address => bool) public hasClaimed;

    event BetPlaced(address indexed user, bool isYes, uint256 amount);
    event PoolResolved(bool outcome);
    event WinningsClaimed(address indexed user, uint256 tokenAmount);
    event TokensSold(address indexed user, uint256 tokenAmount, uint256 okbAmount);

    constructor(address _factory, address _creator, uint256 _deadline, address _token) {
        factory = _factory;
        creator = _creator;
        deadline = _deadline;
        token = IMilestoneToken(_token);
    }

    function betYes() external payable nonReentrant {
        _placeBet(true);
    }

    function betNo() external payable nonReentrant {
        _placeBet(false);
    }

    function _placeBet(bool isYes) internal {
        require(msg.sender != creator, "Creator cannot bet on own milestone");
        require(block.timestamp <= deadline - 5 minutes, "Trading cutoff reached");
        require(msg.value >= 0.0001 ether, "Min bet 0.0001 ether");
        require(isYes ? noBets[msg.sender] == 0 : yesBets[msg.sender] == 0, "Wash trading not allowed");

        uint256 currentTotal = totalYes + totalNo;
        if (currentTotal > 0) {
            uint256 maxBet = (currentTotal + msg.value) * 20 / 100;
            require(msg.value <= maxBet, "Exceeds max single bet of 20% pool");
        }

        if (isYes) {
            yesBets[msg.sender] += msg.value;
            totalYes += msg.value;
        } else {
            noBets[msg.sender] += msg.value;
            totalNo += msg.value;
        }

        emit BetPlaced(msg.sender, isYes, msg.value);
    }

    function resolve(bool _outcome) external {
        require(msg.sender == factory, "Only factory can resolve");
        require(!isResolved, "Already resolved");
        isResolved = true;
        outcome = _outcome;
        
        uint256 winningPool = _outcome ? totalYes : totalNo;
        if (winningPool > 0) {
            rewardTokenBalance = token.balanceOf(address(this));
        } else {
            // No winners. Burn entire reward allocation so remaining tokens (creator's 20%)
            // capture 100% of the OKB pool backing. "Haters fund your liquidity".
            token.burn(token.balanceOf(address(this)));
        }
        
        emit PoolResolved(_outcome);
    }

    function claimWinnings() external nonReentrant {
        require(isResolved, "Not resolved yet");
        require(!hasClaimed[msg.sender], "Already claimed");
        
        uint256 userBet = outcome ? yesBets[msg.sender] : noBets[msg.sender];
        require(userBet > 0, "No winnings to claim");
        hasClaimed[msg.sender] = true;

        uint256 winningPool = outcome ? totalYes : totalNo;
        require(winningPool > 0, "No winners");

        // The pool holds 80% of total token supply at resolution.
        // We distribute that based on the user's share of the winning pool,
        // using the cached balance so math doesn't break for subsequent claimers.
        uint256 payoutTokens = (userBet * rewardTokenBalance) / winningPool;

        require(token.transfer(msg.sender, payoutTokens), "Token transfer failed");

        emit WinningsClaimed(msg.sender, payoutTokens);
    }

    // Burn-to-Redeem mechanic: perfectly stable intrinsic value backed by OKB
    function sellTokens(uint256 amount) external nonReentrant {
        require(isResolved, "Not resolved yet");
        require(amount > 0, "Must sell more than 0");

        // Mathematical floor price: OKB per token
        uint256 totalRemainingTokens = token.totalSupply();
        uint256 poolOKBBalance = address(this).balance;

        uint256 payoutOKB = (amount * poolOKBBalance) / totalRemainingTokens;
        
        // Burn tokens from user
        token.burnFrom(msg.sender, amount);

        // Send OKB back
        (bool success, ) = msg.sender.call{value: payoutOKB}("");
        require(success, "OKB Transfer failed");

        emit TokensSold(msg.sender, amount, payoutOKB);
    }

    function getPoolState() external view returns (uint256 _totalYes, uint256 _totalNo, bool _isResolved, bool _outcome, uint256 _rewardTokenBalance) {
        return (totalYes, totalNo, isResolved, outcome, rewardTokenBalance);
    }
}

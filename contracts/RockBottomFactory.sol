// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./MilestoneToken.sol";
import "./MilestonePool.sol";

contract RockBottomFactory {
    address public immutable agent;
    uint256 public milestoneCount;

    struct Milestone {
        uint256 id;
        address tokenAddress;
        address poolAddress;
        address creator;
        string title;
        uint256 deadline;
        bool resolved;
    }

    mapping(uint256 => Milestone) public milestones;

    event MilestoneCreated(uint256 indexed id, address token, address pool, address creator, string title);
    event MilestoneResolved(uint256 indexed id, bool outcome);

    constructor() {
        agent = msg.sender;
    }

    function createMilestone(
        address creator,
        string memory title,
        string memory tokenName,
        string memory tokenTicker,
        uint256 totalSupply,
        uint256 deadline
    ) external returns (uint256 id) {
        require(msg.sender == agent, "Only agent can create milestones");
        id = ++milestoneCount;

        MilestoneToken token = new MilestoneToken(tokenName, tokenTicker, totalSupply, address(this));
        MilestonePool pool = new MilestonePool(address(this), creator, deadline, address(token));

        // Distribute 80% to Pool (Liquidity Vault), 20% to Creator
        uint256 poolShare = (totalSupply * 80) / 100;
        uint256 creatorShare = totalSupply - poolShare;
        
        token.transfer(address(pool), poolShare);
        token.transfer(creator, creatorShare);

        milestones[id] = Milestone({
            id: id,
            tokenAddress: address(token),
            poolAddress: address(pool),
            creator: creator,
            title: title,
            deadline: deadline,
            resolved: false
        });

        emit MilestoneCreated(id, address(token), address(pool), creator, title);
    }

    function resolveMilestone(uint256 id, bool outcome) external {
        require(msg.sender == agent, "Only agent can resolve");
        require(id > 0 && id <= milestoneCount, "Invalid milestone id");
        require(!milestones[id].resolved, "Already resolved");

        Milestone storage milestone = milestones[id];
        milestone.resolved = true;

        MilestonePool(milestone.poolAddress).resolve(outcome);

        emit MilestoneResolved(id, outcome);
    }

    function getMilestone(uint256 id) external view returns (Milestone memory) {
        return milestones[id];
    }
}

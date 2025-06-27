// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./DappToken.sol";
import "./LPToken.sol";

/**
 * @title Proportional Token Farm
 */
contract TokenFarm {
    // Estado
    string public name = "Proportional Token Farm";
    address public owner;
    DAppToken public dappToken;
    LPToken public lpToken;

    uint256 public rewardPerBlock = 1e18;
    uint256 public totalStakingBalance;

    struct Staker {
        uint256 balance;
        uint256 checkpoint;
        uint256 pending;
        bool hasStaked;
        bool isStaking;
    }

    mapping(address => Staker) public stakers;
    address[] public stakerAddresses;

    // Eventos
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed();

    // Modificadores
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyStaker() {
        require(stakers[msg.sender].isStaking, "Not staking");
        _;
    }

    constructor(DAppToken _dappToken, LPToken _lpToken) {
    dappToken = _dappToken;
    lpToken = _lpToken;
    owner = msg.sender;
}

    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount > 0");
        lpToken.transferFrom(msg.sender, address(this), _amount);

        // Distribuir recompensas antes de actualizar el estado
        if (stakers[msg.sender].isStaking) {
            distributeRewards(msg.sender);
        } else {
            stakers[msg.sender].checkpoint = block.number;
            stakers[msg.sender].hasStaked = true;
            stakerAddresses.push(msg.sender);
        }

        stakers[msg.sender].balance += _amount;
        stakers[msg.sender].isStaking = true;
        totalStakingBalance += _amount;

        emit Deposited(msg.sender, _amount);
    }

    function withdraw() external onlyStaker {
        Staker storage user = stakers[msg.sender];
        uint256 balance = user.balance;
        require(balance > 0, "Nothing to withdraw");

        distributeRewards(msg.sender);

        user.balance = 0;
        user.isStaking = false;
        totalStakingBalance -= balance;

        lpToken.transfer(msg.sender, balance);

        emit Withdrawn(msg.sender, balance);
    }

    function claimRewards() external {
        distributeRewards(msg.sender);

        uint256 amount = stakers[msg.sender].pending;
        require(amount > 0, "No rewards");

        stakers[msg.sender].pending = 0;
        dappToken.mint(msg.sender, amount);

        emit RewardsClaimed(msg.sender, amount);
    }

    function distributeRewardsAll() external onlyOwner {
        for (uint i = 0; i < stakerAddresses.length; i++) {
            address user = stakerAddresses[i];
            if (stakers[user].isStaking) {
                distributeRewards(user);
            }
        }

        emit RewardsDistributed();
    }


    function distributeRewards(address beneficiary) internal {
        Staker storage user = stakers[beneficiary];
        if (user.balance == 0 || totalStakingBalance == 0) return;

        uint256 blocksPassed = block.number - user.checkpoint;
        if (blocksPassed == 0) return;

        uint256 share = (user.balance * 1e18) / totalStakingBalance;
        uint256 reward = (rewardPerBlock * blocksPassed * share) / 1e18;

        user.pending += reward;
        user.checkpoint = block.number;
    }
}

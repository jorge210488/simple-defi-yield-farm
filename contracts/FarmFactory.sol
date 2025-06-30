// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./TokenFarmCloneable.sol"; 


contract FarmFactory {
    address public implementation;
    address[] public farms;

    event FarmCreated(address indexed farm, address indexed lpToken, uint256 rewardRate);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createFarm(address _dappToken, address _lpToken, uint256 _initialRate) external {
        address clone = Clones.clone(implementation);
        TokenFarmCloneable(clone).initialize(_dappToken, _lpToken, _initialRate);
        farms.push(clone);
        emit FarmCreated(clone, _lpToken, _initialRate);
    }

    function getAllFarms() external view returns (address[] memory) {
        return farms;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable2StepUpgradeable } from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IDAppToken.sol";

contract TokenFarmCloneable is Initializable, Ownable2StepUpgradeable {
    IDAppToken public dappToken;
    IERC20 public lpToken;
    uint256 public rewardRate;
    uint256 public totalStaked;
    uint256 public totalFees;

    struct Staker {
        uint256 balance;
        uint256 checkpoint;
        uint256 pending;
        bool hasStaked;
        bool isStaking;
    }

    mapping(address => Staker) public stakers;
    address[] public stakersList;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 netReward, uint256 fee);
    event RewardsDistributed(uint256 totalDistributed);
    event RewardRateUpdated(uint256 newRate);

    modifier onlyStaker() {
        require(stakers[msg.sender].hasStaked, "No ha participado en staking");
        _;
    }

    // ✅ Esto reemplaza el constructor
    function initialize(address _dappToken, address _lpToken, uint256 _initialRate) external initializer {
        dappToken = IDAppToken(_dappToken);
        lpToken = IERC20(_lpToken);
        rewardRate = _initialRate;

        __Ownable2Step_init(); // Reemplaza al _transferOwnership()
    }

    /**
     * @dev Actualiza la tasa de recompensas por bloque. Solo llamable por el owner.
     * @param _rate Nueva tasa de recompensa (tokens DAppToken por bloque).
     */
    function setRewardRate(uint256 _rate) external onlyOwner {
        rewardRate = _rate;
        emit RewardRateUpdated(_rate);
    }

    /**
     * @dev Deposita (hace staking) una cantidad de tokens LP en el farm.
     * Actualiza las recompensas pendientes antes de incrementar el stake del usuario.
     * @param amount Cantidad de tokens LP a depositar (debe haberse aprobado previamente al contrato).
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "La cantidad a depositar debe ser mayor que 0");
        Staker storage staker = stakers[msg.sender];

        // Si el usuario ya estaba haciendo staking, acumulamos las recompensas pendientes hasta el bloque actual
        if (staker.isStaking && staker.balance > 0) {
            uint256 blocksElapsed = block.number - staker.checkpoint;
            if (blocksElapsed > 0 && totalStaked > 0) {
                uint256 userReward = (blocksElapsed * rewardRate * staker.balance) / totalStaked;
                staker.pending += userReward;
            }
        }

        // Si es la primera vez que hace stake, lo añadimos a la lista de stakers
        if (!staker.hasStaked) {
            staker.hasStaked = true;
            stakersList.push(msg.sender);
        }

        // Actualizamos el balance staked del usuario y el total staked global
        staker.balance += amount;
        totalStaked += amount;
        staker.isStaking = true;
        // Actualizamos el checkpoint del usuario al bloque actual
        staker.checkpoint = block.number;

        // Transferimos los tokens LP del usuario al contrato (requiere aprobación previa)
        require(lpToken.transferFrom(msg.sender, address(this), amount), "Fallo en la transferencia de tokens LP");

        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Retira una cantidad de tokens LP previamente staked por el usuario.
     * Actualiza las recompensas pendientes antes de retirar.
     * @param amount Cantidad de tokens LP a retirar.
     */
    function withdraw(uint256 amount) external onlyStaker {
        Staker storage staker = stakers[msg.sender];
        require(amount > 0, "La cantidad a retirar debe ser mayor que 0");
        require(amount <= staker.balance, "Cantidad a retirar supera el balance staked");

        // Acumulamos las recompensas pendientes hasta el bloque actual antes de modificar el balance
        uint256 blocksElapsed = block.number - staker.checkpoint;
        if (blocksElapsed > 0 && totalStaked > 0) {
            uint256 userReward = (blocksElapsed * rewardRate * staker.balance) / totalStaked;
            staker.pending += userReward;
        }

        // Actualizamos los balances tras el retiro
        staker.balance -= amount;
        totalStaked -= amount;

        // Transferimos los tokens LP de vuelta al usuario
        require(lpToken.transfer(msg.sender, amount), "Fallo en la transferencia de tokens LP");

        emit Withdrawn(msg.sender, amount);

        // Actualizamos el checkpoint al bloque actual
        staker.checkpoint = block.number;
        // Actualizamos el estado de staking del usuario
        if (staker.balance == 0) {
            staker.isStaking = false;
        }
    }

    /**
     * @dev Reclama todas las recompensas acumuladas en DAppToken por el usuario.
     * Aplica una comisión del 10%: transfiere el 90% al usuario y retiene el 10% en el contrato como fee.
     */
    function claimRewards() external onlyStaker {
        Staker storage staker = stakers[msg.sender];
        // Acumular recompensas pendientes hasta el bloque actual antes de reclamar
        uint256 blocksElapsed = block.number - staker.checkpoint;
        if (blocksElapsed > 0 && totalStaked > 0 && staker.balance > 0) {
            uint256 userReward = (blocksElapsed * rewardRate * staker.balance) / totalStaked;
            staker.pending += userReward;
        }

        uint256 reward = staker.pending;
        require(reward > 0, "No hay recompensas por reclamar");

        // Cálculo de la comisión (10%) y recompensa neta (90%)
        uint256 fee = (reward * 10) / 100;
        uint256 netReward = reward - fee;

        // Reiniciamos las recompensas pendientes antes de transferir (previene reentrancia)
        staker.pending = 0;
        // Actualizamos el checkpoint al bloque actual
        staker.checkpoint = block.number;

        // Emitimos tokens de recompensa:
        // - Neto para el usuario
        // - Comisión para el contrato (retenidos como fee)
        if (netReward > 0) {
            dappToken.mint(msg.sender, netReward);
        }
        if (fee > 0) {
            dappToken.mint(address(this), fee);
            totalFees += fee;
        }

        emit RewardsClaimed(msg.sender, netReward, fee);
    }

    /**
     * @dev Permite al owner retirar todos los tokens acumulados como comisiones (fees).
     * Transfiere los DAppToken acumulados en el contrato al owner y reinicia el contador de fees.
     */
    function withdrawFees() external onlyOwner {
        require(totalFees > 0, "No hay comisiones por retirar");
        uint256 feeAmount = totalFees;
        totalFees = 0;
        // Transfiere los DAppToken (fees) desde el contrato al owner
        require(dappToken.transfer(msg.sender, feeAmount), "Fallo al transferir las comisiones");
        // (Opcional: se podría emitir un evento FeesWithdrawn aquí)
    }

    /**
     * @dev Distribuye las recompensas acumuladas para todos los stakers, actualizando sus saldos pendientes.
     * Calcula la recompensa de cada usuario desde su último checkpoint hasta el bloque actual según su proporción de stake.
     * Solo el owner puede ejecutar esta función (p.ej., llamada periódicamente).
     */
    function distributeRewardsAll() external onlyOwner {
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < stakersList.length; i++) {
            address user = stakersList[i];
            Staker storage staker = stakers[user];
            // Solo acumula recompensa si el usuario tiene tokens en staking actualmente
            if (staker.isStaking && staker.balance > 0) {
                uint256 blocksElapsed = block.number - staker.checkpoint;
                if (blocksElapsed > 0 && totalStaked > 0) {
                    uint256 userReward = (blocksElapsed * rewardRate * staker.balance) / totalStaked;
                    staker.pending += userReward;
                    totalDistributed += userReward;
                }
                // Actualizamos el checkpoint de este usuario al bloque actual
                staker.checkpoint = block.number;
            }
        }
        emit RewardsDistributed(totalDistributed);
    }

    /**
     * @dev Consulta la cantidad de recompensas pendientes que tiene un usuario en DAppToken.
     * Es una función de solo lectura (view) que devuelve las recompensas acumuladas hasta el momento.
     * Incluye las recompensas en `staker.pending` más las generadas desde el último checkpoint hasta el bloque actual.
     * @param _user Dirección del usuario a consultar.
     * @return Cantidad de DAppToken pendientes de cobrar por el usuario.
     */
    function pendingRewards(address _user) external view returns (uint256) {
        Staker memory staker = stakers[_user];
        if (!staker.hasStaked) {
            return 0;
        }
        uint256 currentPending = staker.pending;
        if (staker.balance > 0 && totalStaked > 0) {
            uint256 blocksElapsed = block.number - staker.checkpoint;
            if (blocksElapsed > 0) {
                uint256 userReward = (blocksElapsed * rewardRate * staker.balance) / totalStaked;
                currentPending += userReward;
            }
        }
        return currentPending;
    }
}

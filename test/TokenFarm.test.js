const { expect } = require("chai");

describe("Simple Token Farm - Pruebas", function () {
  let owner, user1, user2;
  let dappToken, lpToken, tokenFarm;

  // Deploy de contratos antes de cada test
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Desplegar DAppToken y LPToken, asignando como propietario inicial al owner
    const DappTokenFactory = await ethers.getContractFactory("DAppToken");
    dappToken = await DappTokenFactory.deploy(owner.address);
    await dappToken.waitForDeployment();

    const LPTokenFactory = await ethers.getContractFactory("LPToken");
    lpToken = await LPTokenFactory.deploy(owner.address);
    await lpToken.waitForDeployment();

    // Desplegar TokenFarm pasando las direcciones de los tokens
    const TokenFarmFactory = await ethers.getContractFactory("TokenFarm");
    tokenFarm = await TokenFarmFactory.deploy(
      await dappToken.getAddress(),
      await lpToken.getAddress()
    );
    await tokenFarm.waitForDeployment();

    // Transferir la propiedad de DAppToken al contrato TokenFarm para que pueda acuñar recompensas
    await dappToken
      .connect(owner)
      .transferOwnership(await tokenFarm.getAddress());
  });

  it("Acuña tokens LP para un usuario y permite depositarlos en el farm", async function () {
    // Mint LP tokens al usuario1 por parte del owner (propietario de LPToken)
    const mintAmount = ethers.parseEther("100");
    await lpToken.connect(owner).mint(user1.address, mintAmount);
    expect(await lpToken.balanceOf(user1.address)).to.equal(mintAmount);

    // El usuario1 aprueba al TokenFarm para gastar sus LP tokens antes de depositar
    await lpToken
      .connect(user1)
      .approve(await tokenFarm.getAddress(), mintAmount);

    // Usuario1 deposita 50 LPT en el TokenFarm
    const depositAmount = ethers.parseEther("50");
    await expect(tokenFarm.connect(user1).deposit(depositAmount))
      .to.emit(tokenFarm, "Deposited")
      .withArgs(user1.address, depositAmount);

    // Verificar que el saldo en staking del usuario1 se actualiza correctamente en el contrato
    const stakerInfo = await tokenFarm.stakers(user1.address);
    expect(stakerInfo.balance).to.equal(depositAmount);
    expect(stakerInfo.isStaking).to.be.true;
    expect(stakerInfo.hasStaked).to.be.true;
    // El total de balance staked en la plataforma debe reflejar los 50 LPT depositados
    expect(await tokenFarm.totalStakingBalance()).to.equal(depositAmount);

    // Verificar transferencia de tokens LP: el usuario1 ahora tiene 50 LPT menos, y el contrato TokenFarm posee esos 50 LPT
    expect(await lpToken.balanceOf(user1.address)).to.equal(
      mintAmount - depositAmount
    ); // debería restar 50 LPT
    expect(await lpToken.balanceOf(await tokenFarm.getAddress())).to.equal(
      depositAmount
    );

    // El array de stakers debe haber registrado al usuario1
    expect(await tokenFarm.stakerAddresses(0)).to.equal(user1.address);
  });

  it("Distribuye correctamente las recompensas entre todos los usuarios en staking", async function () {
    // Preparar dos usuarios con tokens LP acuñados por el owner
    const amountUser1 = ethers.parseEther("100");
    const amountUser2 = ethers.parseEther("100");
    await lpToken.connect(owner).mint(user1.address, amountUser1);
    await lpToken.connect(owner).mint(user2.address, amountUser2);
    // Ambos usuarios aprueban al TokenFarm para transferir sus tokens LP
    await lpToken
      .connect(user1)
      .approve(await tokenFarm.getAddress(), amountUser1);
    await lpToken
      .connect(user2)
      .approve(await tokenFarm.getAddress(), amountUser2);

    // Usuario1 deposita 100 LPT en el bloque actual
    const tx1 = await tokenFarm.connect(user1).deposit(amountUser1);
    const receipt1 = await tx1.wait();
    const deposit1Block = receipt1.blockNumber;

    // Avanzar algunos bloques (simular tiempo transcurrido en staking antes de que otro usuario entre)
    await ethers.provider.send("evm_mine", []); // minar 1 bloque vacío
    await ethers.provider.send("evm_mine", []); // minar otro bloque vacío

    // Usuario2 deposita 100 LPT unos bloques después
    const tx2 = await tokenFarm.connect(user2).deposit(amountUser2);
    const receipt2 = await tx2.wait();
    const deposit2Block = receipt2.blockNumber;
    expect(deposit2Block).to.be.greaterThan(deposit1Block);

    // Llamar a distributeRewardsAll desde el owner para distribuir recompensas pendientes a todos
    await expect(tokenFarm.connect(owner).distributeRewardsAll()).to.emit(
      tokenFarm,
      "RewardsDistributed"
    );

    // Obtener la información de ambos stakers después de la distribución
    const info1 = await tokenFarm.stakers(user1.address);
    const info2 = await tokenFarm.stakers(user2.address);

    // Ambos usuarios deberían tener recompensas pendientes (> 0) después de la distribución
    expect(info1.pending).to.be.gt(0);
    expect(info2.pending).to.be.gt(0);

    // El usuario1 comenzó a hacer staking antes, por lo que su recompensa acumulada debería ser mayor que la del usuario2
    expect(info1.pending).to.be.gt(info2.pending);

    // Verificar que los checkpoints de ambos se actualizaron al bloque actual (después de distribuir)
    const currentBlock = await ethers.provider.getBlockNumber();
    expect(info1.checkpoint).to.equal(currentBlock);
    expect(info2.checkpoint).to.equal(currentBlock);
  });

  it("Permite a un usuario reclamar sus recompensas y transferirlas a su cuenta correctamente", async function () {
    // Configuración: acuñar y depositar tokens LP para el usuario1
    const stakeAmount = ethers.parseEther("50");
    await lpToken.connect(owner).mint(user1.address, stakeAmount);
    await lpToken
      .connect(user1)
      .approve(await tokenFarm.getAddress(), stakeAmount);
    const depositTx = await tokenFarm.connect(user1).deposit(stakeAmount);
    const depositReceipt = await depositTx.wait();
    const startBlock = depositReceipt.blockNumber;

    // Avanzar algunos bloques para acumular recompensas
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    // Obtener balance de DAppToken del usuario1 antes de reclamar
    const balanceBefore = await dappToken.balanceOf(user1.address);

    // El usuario1 reclama sus recompensas DAPP
    const claimTx = await tokenFarm.connect(user1).claimRewards();
    const claimReceipt = await claimTx.wait();
    const endBlock = claimReceipt.blockNumber;
    const claimedEvent = claimReceipt.logs.find(
      (log) => log.event === "RewardsClaimed"
    );
    expect(claimTx).to.emit(tokenFarm, "RewardsClaimed"); // verificar que el evento se emitió

    // Calcular la recompensa esperada manualmente:
    // rewardPerBlock * (endBlock - startBlock) * (balance/totalBalance).
    const rewardPerBlock = await tokenFarm.rewardPerBlock();
    const blocksElapsed = endBlock - startBlock;
    const expectedReward = rewardPerBlock * BigInt(blocksElapsed); // user1 es único staker, share = 1

    // Balance de DAppToken después de reclamar
    const balanceAfter = await dappToken.balanceOf(user1.address);
    const rewardReceived = balanceAfter - balanceBefore;

    // Verificar que el usuario recibió la cantidad correcta de recompensas en DAPP
    expect(rewardReceived).to.equal(expectedReward);
    // También confirmar que las recompensas pendientes del usuario ahora son cero
    const stakerInfoAfterClaim = await tokenFarm.stakers(user1.address);
    expect(stakerInfoAfterClaim.pending).to.equal(0n);
  });

  it("Permite a un usuario retirar todos sus tokens LP staked y luego reclamar recompensas pendientes", async function () {
    // Configuración: usuario1 deposita tokens LP en staking
    const stakeAmount = ethers.parseEther("30");
    await lpToken.connect(owner).mint(user1.address, stakeAmount);
    await lpToken
      .connect(user1)
      .approve(await tokenFarm.getAddress(), stakeAmount);
    const depositTx = await tokenFarm.connect(user1).deposit(stakeAmount);
    await depositTx.wait();

    // Avanzar un bloque para generar alguna recompensa pendiente
    await ethers.provider.send("evm_mine", []);

    // El usuario1 retira todos sus tokens LP del farm
    await expect(tokenFarm.connect(user1).withdraw())
      .to.emit(tokenFarm, "Withdrawn")
      .withArgs(user1.address, stakeAmount);

    // Verificar que el usuario recuperó sus tokens LP (saldo de LPToken de vuelta a 30)
    expect(await lpToken.balanceOf(user1.address)).to.equal(stakeAmount);
    // El contrato TokenFarm ya no tiene tokens LP del usuario1
    expect(await lpToken.balanceOf(await tokenFarm.getAddress())).to.equal(0);

    // Después del withdraw, el registro del usuario en TokenFarm debe reflejar 0 balance y no estar en staking
    const infoAfterWithdraw = await tokenFarm.stakers(user1.address);
    expect(infoAfterWithdraw.balance).to.equal(0n);
    expect(infoAfterWithdraw.isStaking).to.be.false;

    // Si el usuario tenía recompensas pendientes acumuladas, deberían permanecer registradas
    expect(infoAfterWithdraw.pending).to.be.gt(0);

    // El usuario reclama las recompensas pendientes después de retirar
    const dappBalanceBefore = await dappToken.balanceOf(user1.address);
    await tokenFarm.connect(user1).claimRewards();
    const dappBalanceAfter = await dappToken.balanceOf(user1.address);

    // La diferencia en el balance de DAppToken debe ser igual a las recompensas pendientes que tenía el usuario
    const claimedAmount = dappBalanceAfter - dappBalanceBefore;
    expect(claimedAmount).to.equal(infoAfterWithdraw.pending);

    // Tras reclamar, las recompensas pendientes del usuario deberían ser 0
    const infoAfterClaim = await tokenFarm.stakers(user1.address);
    expect(infoAfterClaim.pending).to.equal(0n);
  });
});

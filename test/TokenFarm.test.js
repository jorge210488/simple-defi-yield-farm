const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFarm", function () {
  let owner, user1;
  let dappToken, lpToken, tokenFarm;

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();

    const DAppToken = await ethers.getContractFactory("DAppToken");
    dappToken = await DAppToken.connect(owner).deploy(owner.address);
    await dappToken.waitForDeployment();

    const LPToken = await ethers.getContractFactory("LPToken");
    lpToken = await LPToken.connect(owner).deploy(owner.address);
    await lpToken.waitForDeployment();

    const TokenFarm = await ethers.getContractFactory("TokenFarm");
    tokenFarm = await TokenFarm.deploy(
      await dappToken.getAddress(),
      await lpToken.getAddress(),
      ethers.parseUnits("1", 18) // rewardRate = 1 DAPP por bloque
    );
    await tokenFarm.waitForDeployment();

    // Transferir la propiedad del DAppToken al TokenFarm para que pueda hacer mint
    await dappToken
      .connect(owner)
      .transferOwnership(await tokenFarm.getAddress());
  });

  it("Acuña tokens LP para un usuario y permite depositarlos en el farm", async function () {
    const mintAmount = ethers.parseEther("100");
    await lpToken.connect(owner).mint(user1.address, mintAmount);
    expect(await lpToken.balanceOf(user1.address)).to.equal(mintAmount);

    await lpToken
      .connect(user1)
      .approve(await tokenFarm.getAddress(), mintAmount);

    const depositAmount = ethers.parseEther("50");
    await expect(tokenFarm.connect(user1).deposit(depositAmount))
      .to.emit(tokenFarm, "Deposited")
      .withArgs(user1.address, depositAmount);

    const stakerInfo = await tokenFarm.stakers(user1.address);
    expect(stakerInfo.balance).to.equal(depositAmount);
    expect(stakerInfo.isStaking).to.be.true;
    expect(stakerInfo.hasStaked).to.be.true;

    expect(await tokenFarm.totalStaked()).to.equal(depositAmount);

    expect(await lpToken.balanceOf(user1.address)).to.equal(
      mintAmount - depositAmount
    );
    expect(await lpToken.balanceOf(await tokenFarm.getAddress())).to.equal(
      depositAmount
    );

    expect(await tokenFarm.stakersList(0)).to.equal(user1.address);
  });

  it("distribuye recompensas a todos los stakers correctamente", async () => {
    const amount = ethers.parseEther("100");

    await lpToken.connect(owner).mint(user1.address, amount);
    await lpToken.connect(user1).approve(tokenFarm.getAddress(), amount);
    await tokenFarm.connect(user1).deposit(amount);

    // Avanzamos 10 bloques
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine");
    }

    // Owner llama a distributeRewardsAll
    await expect(tokenFarm.connect(owner).distributeRewardsAll()).to.emit(
      tokenFarm,
      "RewardsDistributed"
    );

    const pending = await tokenFarm.pendingRewards(user1.address);
    expect(pending).to.be.gt(0);
  });

  it("permite reclamar recompensas acumuladas", async () => {
    const amount = ethers.parseEther("100");

    await lpToken.connect(owner).mint(user1.address, amount);
    await lpToken.connect(user1).approve(tokenFarm.getAddress(), amount);
    await tokenFarm.connect(user1).deposit(amount);

    // Esperar unos bloques
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_mine");
    }

    await tokenFarm.connect(user1).claimRewards();

    const balance = await dappToken.balanceOf(user1.address);
    expect(balance).to.be.gt(0); // debería haber recibido el 90%
  });

  it("permite retirar LP y luego reclamar recompensas", async () => {
    const amount = ethers.parseEther("100");

    await lpToken.connect(owner).mint(user1.address, amount);
    await lpToken.connect(user1).approve(tokenFarm.getAddress(), amount);
    await tokenFarm.connect(user1).deposit(amount);

    // Pasan bloques para generar rewards
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_mine");
    }

    // Retira LP sin reclamar aún
    await tokenFarm.connect(user1).withdraw(amount);

    // Reclama recompensas pendientes
    await tokenFarm.connect(user1).claimRewards();

    const balance = await dappToken.balanceOf(user1.address);
    expect(balance).to.be.gt(0);
  });
});

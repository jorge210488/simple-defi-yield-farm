const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando contratos con la cuenta:", deployer.address);

  const DAppToken = await ethers.getContractFactory("DAppToken");
  const dappToken = await DAppToken.deploy(deployer.address);
  console.log("DAppToken desplegado en:", await dappToken.getAddress());

  const LPToken = await ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy(deployer.address);
  console.log("LPToken desplegado en:", await lpToken.getAddress());

  const initialRate = ethers.parseUnits("1", 18); // ← parseUnits nativo de viem o hardhat@6

  const TokenFarm = await ethers.getContractFactory("TokenFarm");
  const tokenFarm = await TokenFarm.deploy(
    await dappToken.getAddress(),
    await lpToken.getAddress(),
    initialRate
  );
  console.log("TokenFarm desplegado en:", await tokenFarm.getAddress());

  const transferTx = await dappToken.transferOwnership(
    await tokenFarm.getAddress()
  );
  await transferTx.wait();
  console.log("Propiedad de DAppToken transferida a TokenFarm.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

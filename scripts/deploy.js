require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con:", deployer.address);

  const LPToken = await ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy(deployer.address);
  await lpToken.waitForDeployment();
  console.log("LPToken en:", await lpToken.getAddress());

  const DAppToken = await ethers.getContractFactory("DAppToken");
  const dappToken = await DAppToken.deploy(deployer.address); // temporalmente owner = deployer
  await dappToken.waitForDeployment();
  console.log("DAppToken en:", await dappToken.getAddress());

  const initialRate = ethers.parseUnits("1", 18); // 1 LP serán 18 DAPP inicialmente

  const TokenFarm = await ethers.getContractFactory("TokenFarm");
  const tokenFarm = await TokenFarm.deploy(
    await dappToken.getAddress(),
    await lpToken.getAddress(),
    initialRate
  );
  await tokenFarm.waitForDeployment();
  console.log("TokenFarm en:", await tokenFarm.getAddress());

  // Transferimos propiedad del DAppToken al TokenFarm
  const tx = await dappToken.transferOwnership(await tokenFarm.getAddress());
  await tx.wait();
  console.log("DAppToken ahora pertenece a TokenFarm");

  console.log("✅ Deploy completo");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en el deploy:", error);
    process.exit(1);
  });

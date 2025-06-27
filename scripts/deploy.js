const hre = require("hardhat");

async function main() {
  const formatEther = hre.ethers.formatEther;
  const [deployer] = await hre.ethers.getSigners();

  console.log("🔨 Desplegando contratos con la cuenta:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance del deployer:", formatEther(balance));

  const DappTokenFactory = await hre.ethers.getContractFactory("DAppToken");
  const dappToken = await DappTokenFactory.deploy(deployer.address);
  console.log("✅ DAppToken desplegado en:", await dappToken.getAddress());

  const LPTokenFactory = await hre.ethers.getContractFactory("LPToken");
  const lpToken = await LPTokenFactory.deploy(deployer.address);
  console.log("✅ LPToken desplegado en:", await lpToken.getAddress());

  const TokenFarmFactory = await hre.ethers.getContractFactory("TokenFarm");
  const tokenFarm = await TokenFarmFactory.deploy(
    await dappToken.getAddress(),
    await lpToken.getAddress()
  );
  console.log("✅ TokenFarm desplegado en:", await tokenFarm.getAddress());

  const transferTx = await dappToken.transferOwnership(
    await tokenFarm.getAddress()
  );
  await transferTx.wait();
  console.log("🔑 Ownership de DAppToken transferido a TokenFarm");

  console.log("🚀 Despliegue completo");
}

main().catch((err) => {
  console.error("❌ Error al desplegar contratos:", err);
  process.exit(1);
});

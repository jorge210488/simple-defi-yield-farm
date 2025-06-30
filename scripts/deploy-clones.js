require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Desplegando con:", deployer.address);

  // 1. Desplegar LPToken
  const LPToken = await ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy(deployer.address);
  await lpToken.waitForDeployment();
  console.log("🪙 LPToken en:", await lpToken.getAddress());

  // 2. Desplegar DAppToken
  const DAppToken = await ethers.getContractFactory("DAppToken");
  const dappToken = await DAppToken.deploy(deployer.address);
  await dappToken.waitForDeployment();
  console.log("💎 DAppToken en:", await dappToken.getAddress());

  // 3. Desplegar implementación base del TokenFarmCloneable
  const TokenFarmCloneable = await ethers.getContractFactory(
    "TokenFarmCloneable"
  );
  const implementation = await TokenFarmCloneable.deploy();
  await implementation.waitForDeployment();
  console.log(
    "📦 TokenFarmCloneable (implementación base) en:",
    await implementation.getAddress()
  );

  // 4. Desplegar la fábrica
  const FarmFactory = await ethers.getContractFactory("FarmFactory");
  const factory = await FarmFactory.deploy(await implementation.getAddress());
  await factory.waitForDeployment();
  console.log("🏭 FarmFactory en:", await factory.getAddress());

  // 5. Crear un nuevo clone/farm desde la fábrica
  const initialRate = ethers.parseUnits("1", 18); // 1 LP = 1 DAPP
  const tx = await factory.createFarm(
    await dappToken.getAddress(),
    await lpToken.getAddress(),
    initialRate
  );
  const receipt = await tx.wait();

  // Extraer el evento FarmCreated del receipt
  const farmCreatedEvent = receipt.logs.find(
    (log) => log.fragment?.name === "FarmCreated"
  );

  if (!farmCreatedEvent) {
    throw new Error("❌ No se encontró el evento FarmCreated en los logs.");
  }

  const cloneAddress = farmCreatedEvent.args.farm;
  console.log("🌱 Nuevo TokenFarm (clone) en:", cloneAddress);

  // 6. Transferir propiedad del DAppToken al clone
  const transferTx = await dappToken.transferOwnership(cloneAddress);
  await transferTx.wait();
  console.log("✅ DAppToken ahora pertenece al clone");

  console.log("🎉 Deploy completo con clon exitoso.");
}

main().catch((error) => {
  console.error("❌ Error en el deploy:", error);
  process.exit(1);
});

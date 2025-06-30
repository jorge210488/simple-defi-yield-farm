require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  const dappTokenAddress = process.env.DAPP_TOKEN_ADDRESS;
  const lpTokenAddress = process.env.LP_TOKEN_ADDRESS;
  const farmFactoryAddress = process.env.FARM_FACTORY_ADDRESS;
  const initialRewardRate = process.env.REWARD_RATE_WEI;

  if (
    !dappTokenAddress ||
    !lpTokenAddress ||
    !farmFactoryAddress ||
    !initialRewardRate
  ) {
    throw new Error("❌ Faltan variables de entorno en el archivo .env");
  }

  const farmFactory = await ethers.getContractAt(
    "FarmFactory",
    farmFactoryAddress
  );

  console.log("📦 Creando nuevo TokenFarm clone...");
  const tx = await farmFactory.createFarm(
    dappTokenAddress,
    lpTokenAddress,
    initialRewardRate
  );
  const receipt = await tx.wait();

  // ✅ Procesar logs manualmente si receipt.events está vacío
  let eventFound = false;
  for (const log of receipt.logs) {
    try {
      const parsedLog = farmFactory.interface.parseLog(log);
      if (parsedLog.name === "FarmCreated") {
        console.log("✅ Nuevo TokenFarm clone en:", parsedLog.args.farm);
        eventFound = true;
        break;
      }
    } catch (err) {
      // No es un log de este contrato, lo ignoramos
    }
  }

  if (!eventFound) {
    console.log("⚠️ No se encontró el evento 'FarmCreated'.");
    console.log("🔎 Tx Hash:", receipt.transactionHash);
  }
}

main().catch((error) => {
  console.error("❌ Error ejecutando el script:", error);
  process.exitCode = 1;
});

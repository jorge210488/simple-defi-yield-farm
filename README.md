# 🌾 TokenFarm - Contrato de Yield Farming en Ethereum

## 🎯 Descripción

Este proyecto implementa un contrato inteligente llamado **TokenFarm** que permite a los usuarios hacer **staking de tokens LP** y ganar recompensas en **DApp Tokens**.

El contrato permite a los usuarios:

- Depositar tokens LP para comenzar a hacer staking.
- Retirar sus tokens LP en cualquier momento.
- Reclamar las recompensas acumuladas.
- Visualizar su balance en staking y sus recompensas.
- Pagar una comisión del 10% al reclamar recompensas.
- Y al **owner**:

  - Distribuir recompensas a todos los usuarios.
  - Retirar las comisiones acumuladas.
  - Modificar la tasa de recompensa por bloque.

El contrato está desplegado en la testnet **Sepolia**.

---

## 🚀 Tecnologías

- Solidity
- Hardhat + Hardhat Toolbox
- OpenZeppelin Contracts
- dotenv
- Ethers.js
- Sepolia testnet

---

## 🛠️ Instalación

1️⃣ Clona el repositorio:

```bash
git clone https://github.com/jorge210488/simple-defi-yield-farm.git
cd simple-defi-yield-farm
```

2️⃣ Instala dependencias:

```bash
npm install
```

3️⃣ Crea un archivo `.env` con la siguiente estructura:

```env
SEPOLIA_URL=https://sepolia.infura.io/v3/TU_API_KEY
PRIVATE_KEY=TU_PRIVATE_KEY
ETHERSCAN_API_KEY=TU_API_KEY_DE_ETHERSCAN
```

**IMPORTANTE:** no subas el `.env` al repositorio público.

---

## 📦 Scripts disponibles

### 👉 Compilar los contratos:

```bash
npx hardhat compile
```

### 👉 Ejecutar los tests:

```bash
npx hardhat test
```

### 👉 Desplegar contratos en Sepolia:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## 🔎 Verificar contratos en Etherscan

> Asegúrate de tener configurada tu API key de Etherscan en `.env`.

### 👉 Verificar `DAppToken`:

```bash
npx hardhat verify --network sepolia \
DAPP_TOKEN_ADDRESS \
OWNER_ADDRESS
```

### 👉 Verificar `LPToken`:

```bash
npx hardhat verify --network sepolia \
LP_TOKEN_ADDRESS \
OWNER_ADDRESS
```

### 👉 Verificar `TokenFarm`:

```bash
npx hardhat verify --network sepolia \
TOKEN_FARM_ADDRESS \
DAPP_TOKEN_ADDRESS \
LP_TOKEN_ADDRESS \
REWARD_RATE_WEI
```

📌 **Parámetros esperados:**

- `DAPP_TOKEN_ADDRESS`: Dirección del contrato `DAppToken`.
- `LP_TOKEN_ADDRESS`: Dirección del contrato `LPToken`.
- `TOKEN_FARM_ADDRESS`: Dirección del contrato `TokenFarm`.
- `OWNER_ADDRESS`: Dirección que desplegó el contrato (deployer).
- `REWARD_RATE_WEI`: Recompensa por bloque en wei (por ejemplo, `1000000000000000000` para 1 DAPP por bloque).

✅ Asegúrate de usar las mismas direcciones y parámetros utilizados durante el despliegue.

### 👉 Probar el contrato localmente con Hardhat Node

1. Ejecuta un nodo local:

```bash
npx hardhat node
```

2. En otro terminal, despliega los contratos en ese nodo:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. Puedes interactuar con el contrato en local desde Hardhat console:

```bash
npx hardhat console --network localhost
```

---

## 🧪 Tests realizados

- ✅ Mint de LP Tokens y depósito en el TokenFarm.
- ✅ Claim de recompensas con validación de comisión (90% al usuario).
- ✅ Retiro de tokens LP y posterior reclamo de recompensas.
- ✅ Distribución global de recompensas solo por el owner.
- ✅ Verificación de balance y estados en el `struct Staker`.

---

## ✅ Funcionalidades del contrato

- ✅ Stake de tokens LP.
- ✅ Claim de recompensas (con fee).
- ✅ Retiro de tokens LP.
- ✅ Recompensas variables ajustables por el owner.
- ✅ Modificadores `onlyStaker` y `onlyOwner`.
- ✅ `Struct` con la info de cada staker.
- ✅ Función `distributeRewardsAll()` solo para owner.
- ✅ Comisión del 10% al reclamar.
- ✅ Función `withdrawFees()` para que el owner retire comisiones.

---

## 📄 Contratos desplegados (Sepolia)

- **LPToken:**
  [`0xB9556a941B661BA5685c7924C64BBE1bA1BD150F`](https://sepolia.etherscan.io/address/0xB9556a941B661BA5685c7924C64BBE1bA1BD150F)

- **DAppToken:**
  [`0x01bb56E6A4deDa43338f8425407743CdCfAC1EA7`](https://sepolia.etherscan.io/address/0x01bb56E6A4deDa43338f8425407743CdCfAC1EA7)

- **TokenFarm:**
  [`0xcbb879E2e8072104F7A1e724B4d597eAF2a1831D`](https://sepolia.etherscan.io/address/0xcbb879E2e8072104F7A1e724B4d597eAF2a1831D)

---

## 💻 Autor

- **Jorge Martínez**
- [https://github.com/jorge210488](https://github.com/jorge210488)

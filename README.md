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

# 🌾 Versión V2 - Múltiples Farms con Clonación (Minimal Proxy)

## 🎯 Descripción

En esta versión se implementa una arquitectura que permite desplegar múltiples instancias del contrato `TokenFarm` de forma eficiente usando **clones (EIP-1167)**.

A través de un contrato **`FarmFactory`**, se crean nuevas farms para diferentes pares de tokens LP y DApp Token, permitiendo escalar la plataforma fácilmente sin gastar gas extra en cada despliegue completo.

---

## 📦 Scripts disponibles

### 👉 Desplegar contratos clonables en Sepolia:

```bash
npx hardhat run scripts/deploy-clones.js --network sepolia
```

Este script:

1. Despliega `LPToken` y `DAppToken`.
2. Despliega `TokenFarmCloneable` como implementación base.
3. Despliega `FarmFactory` que usará esa implementación para clonar farms.
4. Crea una nueva instancia clonada de `TokenFarm`.
5. Transfiere la propiedad del `DAppToken` al nuevo clone.

---

## 🔎 Verificar contratos en Etherscan

> Asegúrate de tener tu clave de API de Etherscan en `.env`.

### 👉 Verificar `LPToken`:

```bash
npx hardhat verify --network sepolia \
LP_TOKEN_ADDRESS \
OWNER_ADDRESS
```

### 👉 Verificar `DAppToken`:

```bash
npx hardhat verify --network sepolia \
DAPP_TOKEN_ADDRESS \
OWNER_ADDRESS
```

### ⚠️ Sobre `TokenFarmCloneable`:

El contrato `TokenFarmCloneable` actúa como **implementación base** para los clones, pero **no es obligatorio verificarlo**, ya que no se interactúa directamente con él.
Sin embargo, si deseas hacerlo para referencia en Etherscan, puedes verificarlo así:

```bash
npx hardhat verify --network sepolia \
TOKEN_FARM_CLONEABLE_ADDRESS
```

### 👉 Verificar `FarmFactory`:

```bash
npx hardhat verify --network sepolia \
FARM_FACTORY_ADDRESS \
TOKEN_FARM_CLONEABLE_ADDRESS
```

📌 **Parámetros esperados:**

- `OWNER_ADDRESS`: Dirección del wallet que desplegó los contratos.
- `TOKEN_FARM_CLONEABLE_ADDRESS`: Dirección del contrato base que se clonará.
- `FARM_FACTORY_ADDRESS`: Dirección del contrato que crea clones.

---

## 🧪 Probar localmente con Hardhat

### 1️⃣ Levanta un nodo local:

```bash
npx hardhat node
```

### 2️⃣ En otro terminal, ejecuta el script de despliegue:

```bash
npx hardhat run scripts/deploy-clones.js --network localhost
```

### 3️⃣ Abre una consola de Hardhat para interactuar:

```bash
npx hardhat console --network localhost
```

---

## ⚙️ Crear un nuevo TokenFarm clonado

Una vez que ya desplegaste el contrato `FarmFactory` y la implementación base `TokenFarmCloneable`, podés crear nuevos clones de farms en cualquier momento.

### 1️⃣ Asegúrate de tener en tu archivo `.env` las siguientes variables:

```env
DAPP_TOKEN_ADDRESS=0xDIRECCION_DEL_TOKEN_DAPP
LP_TOKEN_ADDRESS=0xDIRECCION_DEL_TOKEN_LP
FARM_FACTORY_ADDRESS=0xDIRECCION_DEL_CONTRATO_FACTORY
REWARD_RATE_WEI=1000000000000000000
```

📌 _Asegúrate de que el `DAPP_TOKEN` sea propiedad del nuevo clone (usando `.transferOwnership()` si es necesario)._

---

### 2️⃣ Ejecutá el script para crear una nueva farm clonada:

```bash
npx hardhat run scripts/create-new-farm.js --network sepolia
```

✅ Si todo es correcto, deberías ver algo como:

```
👤 Deployer: 0x...
📦 Creando nuevo TokenFarm clone...
✅ Nuevo TokenFarm clone en: 0xDIRECCION_DEL_CLONE
```

🧠 El contrato creado es una nueva instancia de `TokenFarm`, completamente funcional, asociada a los tokens definidos en las variables de entorno.

---

## ✅ Funcionalidades de la V2

- ✅ Despliegue de farms por clonación (mínimo gas).
- ✅ Farms independientes por par de tokens.
- ✅ Gestión separada de recompensas por cada clone.
- ✅ Permite escalar sin duplicar lógica.
- ✅ Verificación individual de contratos base y fábrica.
- ✅ El contrato `TokenFarmCloneable` no requiere verificación obligatoria.
- ✅ Interacción con clones como si fueran contratos completos.

---

## 📄 Contratos desplegados - Versión Clonable (Sepolia)

- **TokenFarmCloneable (implementación base):**
  [`0x99ACf2cDBbd46C8bEd21A7E25da7EEED2a39ef3a`](https://sepolia.etherscan.io/address/0x99ACf2cDBbd46C8bEd21A7E25da7EEED2a39ef3a)

- **FarmFactory (creador de clones):**
  [`0x0E216f2Afdd1aaE7307A992353fCCF2a59699405`](https://sepolia.etherscan.io/address/0x0E216f2Afdd1aaE7307A992353fCCF2a59699405)

---

## 💻 Autor

- **Jorge Martínez**
- [https://github.com/jorge210488](https://github.com/jorge210488)

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const solc = require('solc');

// IoTeX testnet configuration
const IOTEX_RPC = process.env.IOTEX_RPC || 'https://babel-api.testnet.iotex.io';
const PRIVATE_KEY = process.env.DEPLOYER_PK || null; // set via env; do not commit keys

function compileSolidity(filePath, sourcesExtra = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sources = {
    [path.basename(filePath)]: { content: source }
  };
  for (const [name, p] of Object.entries(sourcesExtra)) {
    sources[name] = { content: fs.readFileSync(p, 'utf8') };
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': [ 'abi', 'evm.bytecode.object' ] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    for (const err of output.errors) {
      if (err.severity === 'error') throw new Error(err.formattedMessage);
      else console.warn(err.formattedMessage);
    }
  }
  const fileKey = Object.keys(output.contracts)[0];
  // Prefer a contract named 'IoTeXProximitySystem' when compiling the system
  const names = Object.keys(output.contracts[fileKey]);
  let contractName = names[0];
  const preferred = names.find((n) => n.includes('IoTeXProximitySystem'));
  if (preferred) contractName = preferred;
  const artifact = output.contracts[fileKey][contractName];
  return { abi: artifact.abi, bytecode: '0x' + artifact.evm.bytecode.object, name: contractName };
}

async function deploy(provider, wallet, abi, bytecode, args = []) {
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 2n) : ethers.parseUnits('500', 'gwei');
  const contract = await factory.deploy(...args, { gasLimit: 6_000_000, gasPrice });
  console.log('  Sent deploy tx:', contract.deployTransaction ? contract.deployTransaction.hash : '(pending)');
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return address;
}

(async () => {
  console.log('\n=== Deploying Proximity Verifier + System (IoTeX) ===');
  const provider = new ethers.JsonRpcProvider(IOTEX_RPC, { chainId: 4690, name: 'iotex-testnet' });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const bal = await provider.getBalance(wallet.address);
  console.log('Deployer:', wallet.address);
  console.log('Balance :', ethers.formatEther(bal), 'IOTX');

  // 1) Compile verifier generated from 6-signal circuit (ProximityVerification6)
  // If you haven't generated it yet, run: scripts/setup/setup-proximity6.sh
  const verifierPathDefault = path.join(__dirname, '../contracts/ProximityGroth16Verifier6.sol');
  const verifierPathFallback = path.join(__dirname, '../contracts/ProximityGroth16Verifier_New.sol');
  const verifierPath = fs.existsSync(verifierPathDefault) ? verifierPathDefault : verifierPathFallback;
  const verifierCompiled = compileSolidity(verifierPath);
  console.log('Compiled verifier:', verifierCompiled.name);

  // 2) Deploy verifier
  console.log('\n-> Deploying Groth16 verifier...');
  const verifierAddr = await deploy(provider, wallet, verifierCompiled.abi, verifierCompiled.bytecode);
  console.log('Verifier deployed:', verifierAddr);

  // 3) Compile system deployable, which takes verifier address in constructor (keeps ABI with 6 signals)
  const systemPath = path.join(__dirname, '../contracts/IoTeXProximitySystemDeployable.sol');
  const systemCompiled = compileSolidity(systemPath);
  console.log('Compiled system:', systemCompiled.name);

  // 4) Deploy system with verifier address
  console.log('\n-> Deploying IoTeXProximitySystem...');
  const systemAddr = await deploy(provider, wallet, systemCompiled.abi, systemCompiled.bytecode, [verifierAddr]);
  console.log('System deployed  :', systemAddr);

  // 5) Persist
  const out = {
    network: 'iotex-testnet',
    verifier: verifierAddr,
    system: systemAddr,
    deployer: wallet.address,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, '../iotex-deployment.json'), JSON.stringify(out, null, 2));
  console.log('\nSaved to iotex-deployment.json');
})();

/**
 * Deploy ZkMLValidationRegistry to Base Sepolia
 *
 * Usage:
 *   npx hardhat run contracts/deploy/deploy-registry.js --network baseSepolia
 */

const hre = require("hardhat");
require("dotenv/config");

async function main() {
  console.log("\n🚀 Deploying zkML Agent Auditor to Base Sepolia...\n");

  // Configuration
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const GROTH16_VERIFIER = process.env.GROTH16_VERIFIER || "0xf752509cb5af017f465B42053d41B730991c6624";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || (await hre.ethers.getSigners())[0].address;

  console.log("📋 Deployment Configuration:");
  console.log(`   USDC Token: ${USDC_ADDRESS}`);
  console.log(`   Groth16 Verifier: ${GROTH16_VERIFIER}`);
  console.log(`   Treasury: ${TREASURY_ADDRESS}\n`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deploying with account: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.lt(hre.ethers.utils.parseEther("0.001"))) {
    throw new Error("❌ Insufficient balance. Need at least 0.001 ETH for deployment.");
  }

  // Deploy ZkMLValidationRegistry
  console.log("📝 Deploying ZkMLValidationRegistry...");

  const ZkMLValidationRegistry = await hre.ethers.getContractFactory("ZkMLValidationRegistry");
  const registry = await ZkMLValidationRegistry.deploy(
    USDC_ADDRESS,
    GROTH16_VERIFIER,
    TREASURY_ADDRESS
  );

  await registry.deployed();
  const registryAddress = registry.address;

  console.log(`✅ ZkMLValidationRegistry deployed to: ${registryAddress}\n`);

  // Set deployer as authorized validator
  console.log("🔐 Authorizing deployer as validator...");
  const tx = await registry.setAuthorizedValidator(deployer.address, true);
  await tx.wait();
  console.log(`✅ Deployer authorized as validator\n`);

  // Deployment summary
  console.log("=" .repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(60));
  console.log(`Contract: ZkMLValidationRegistry`);
  console.log(`Address: ${registryAddress}`);
  console.log(`Network: Base Sepolia (Chain ID: 84532)`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Treasury: ${TREASURY_ADDRESS}`);
  console.log(`\nDependencies:`);
  console.log(`  - USDC: ${USDC_ADDRESS}`);
  console.log(`  - Groth16 Verifier: ${GROTH16_VERIFIER}`);
  console.log(`\nExplorer:`);
  console.log(`  https://sepolia.basescan.org/address/${registryAddress}`);
  console.log("=" .repeat(60));

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    timestamp: new Date().toISOString(),
    contracts: {
      ZkMLValidationRegistry: registryAddress,
      USDC: USDC_ADDRESS,
      Groth16Verifier: GROTH16_VERIFIER
    },
    config: {
      treasury: TREASURY_ADDRESS,
      validationFee: "2000000", // 2 USDC (6 decimals)
      authorizedValidators: [deployer.address]
    },
    explorer: `https://sepolia.basescan.org/address/${registryAddress}`
  };

  const deploymentPath = './deployments.json';
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${deploymentPath}\n`);

  // Verification instructions
  console.log("🔍 To verify on Basescan:");
  console.log(`   npx hardhat verify --network baseSepolia ${registryAddress} "${USDC_ADDRESS}" "${GROTH16_VERIFIER}" "${TREASURY_ADDRESS}"`);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

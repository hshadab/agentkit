const hre = require("hardhat");
require("dotenv/config");

async function main() {
  const deployments = require('../../deployments.json');
  const REGISTRY_ADDRESS = deployments.contracts.ZkMLValidationRegistry;

  const [signer] = await hre.ethers.getSigners();
  const registry = await hre.ethers.getContractAt(
    "ZkMLValidationRegistry",
    REGISTRY_ADDRESS,
    signer
  );

  console.log("Setting validation fee to 0 (FREE)...");
  const tx = await registry.setValidationFee(0);
  await tx.wait();

  console.log("✅ Validation is now FREE!");
  console.log("Fee: 0 USDC");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

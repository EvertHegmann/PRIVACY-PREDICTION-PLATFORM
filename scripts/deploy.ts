import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Privacy Prediction Platform contract...");

  // Get the contract factory
  const PrivacyPredictionPlatform = await ethers.getContractFactory("PrivacyPredictionPlatform");

  // Deploy the contract
  console.log("Deploying contract...");
  const contract = await PrivacyPredictionPlatform.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ PrivacyPredictionPlatform contract deployed to:", contractAddress);

  // Verify deployment
  const owner = await contract.owner();
  console.log("📋 Contract owner:", owner);

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS_RAW in index.html:");
  console.log(`   const CONTRACT_ADDRESS_RAW = "${contractAddress}";`);
  console.log("2. Verify contract on Etherscan (optional)");
  console.log("3. Test contract functionality");

  // Return contract info for verification
  return {
    address: contractAddress,
    owner: owner,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log("Contract Address:", result.address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
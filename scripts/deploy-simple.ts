import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PrivacyPredictionPlatformSimple contract...");

  // Get the contract factory
  const PrivacyPredictionPlatformSimple = await ethers.getContractFactory("PrivacyPredictionPlatformSimple");

  // Deploy the contract
  console.log("Deploying contract...");
  const contract = await PrivacyPredictionPlatformSimple.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ PrivacyPredictionPlatformSimple contract deployed to:", contractAddress);

  // Verify deployment
  const owner = await contract.owner();
  console.log("📋 Contract owner:", owner);

  // Create some initial events
  console.log("\n🎯 Creating initial prediction events...");

  try {
    const tx1 = await contract.createEvent(
      "🏆 2026 FIFA World Cup Winner Prediction",
      "Predict which team will win the 2026 FIFA World Cup! Your prediction will be protected until the tournament ends.",
      90 * 24 * 60 * 60 // 90 days
    );
    await tx1.wait();
    console.log("✅ Event 1 created: FIFA World Cup");

    const tx2 = await contract.createEvent(
      "💎 Bitcoin $100K Breakthrough Prediction",
      "Will Bitcoin break through $100,000 by the end of 2024? Make your confidential prediction now!",
      60 * 24 * 60 * 60 // 60 days
    );
    await tx2.wait();
    console.log("✅ Event 2 created: Bitcoin $100K");

    const tx3 = await contract.createEvent(
      "🎮 Gaming Championship Prediction",
      "Predict the outcome of major esports and gaming championships. Your predictions are secured with cryptographic hashing.",
      30 * 24 * 60 * 60 // 30 days
    );
    await tx3.wait();
    console.log("✅ Event 3 created: Gaming Championship");

  } catch (error) {
    console.error("❌ Failed to create events:", error);
  }

  // Check final state
  const totalEvents = await contract.getTotalEvents();
  console.log("📊 Total events created:", totalEvents.toString());

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS_RAW in index.html:");
  console.log(`   const CONTRACT_ADDRESS_RAW = "${contractAddress}";`);
  console.log("2. Test contract functionality");
  console.log("3. Users can now make predictions!");

  // Return contract info for verification
  return {
    address: contractAddress,
    owner: owner,
    totalEvents: totalEvents.toString(),
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\n🎉 Deployment completed successfully!");
    console.log("Contract Address:", result.address);
    console.log("Total Events:", result.totalEvents);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
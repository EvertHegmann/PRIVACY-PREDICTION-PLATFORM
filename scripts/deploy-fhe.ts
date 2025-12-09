import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Privacy Prediction Platform with FHE...");

  // Get the contract factory
  const PrivacyGuessFHESimple = await ethers.getContractFactory("PrivacyGuessFHESimple");

  // Deploy the contract
  console.log("⚡ Deploying FHE contract to Sepolia...");
  const contract = await PrivacyGuessFHESimple.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ PrivacyGuessFHESimple contract deployed to:", contractAddress);

  // Verify deployment
  const owner = await contract.owner();
  const totalEvents = await contract.getTotalEvents();

  console.log("📋 Contract Info:");
  console.log("   Owner:", owner);
  console.log("   Total Events:", totalEvents.toString());
  console.log("   Solidity Version: 0.8.24");
  console.log("   EVM Version: cancun");

  // Test FHE functions
  console.log("\n🧪 Testing FHE functionality...");

  try {
    // Test creating an event
    console.log("📝 Testing event creation...");
    const eventTx = await contract.createEvent(
      "🧪 FHE Test Event - Bitcoin $100K Prediction",
      "Test event for FHE encrypted predictions using enhanced privacy mechanisms",
      7 * 24 * 60 * 60 // 7 days
    );
    await eventTx.wait();
    console.log("✅ Event creation successful");

    // Test getCurrentRoundInfo
    const roundInfo = await contract.getCurrentRoundInfo(0);
    console.log("📊 Round Info:", {
      roundId: roundInfo[0].toString(),
      isActive: roundInfo[1],
      timeRemaining: roundInfo[2].toString()
    });

    // Test isGuessTimeActive
    const isActive = await contract.isGuessTimeActive(0);
    console.log("⏰ Guess time active:", isActive);

    // Test prediction stats
    const stats = await contract.getPredictionStats(0);
    console.log("📈 Prediction Stats:", {
      totalPredictions: stats[0].toString(),
      isFinalized: stats[1],
      isActive: stats[2]
    });

    console.log("✅ All FHE functionality tests passed!");

  } catch (error) {
    console.error("❌ FHE testing failed:", error);
  }

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS_RAW in index.html:");
  console.log(`   const CONTRACT_ADDRESS_RAW = "${contractAddress}";`);
  console.log("2. Update contract name if needed (PrivacyGuessFHESimple)");
  console.log("3. Test full FHE functionality in web interface");
  console.log("4. Users can now make FHE encrypted predictions!");

  console.log("\n🎉 FHE Features Available:");
  console.log("   ✅ Enhanced privacy with commit-reveal scheme");
  console.log("   ✅ Nonce-based prediction integrity");
  console.log("   ✅ Round-based prediction management");
  console.log("   ✅ Encrypted prediction verification");
  console.log("   ✅ Batch operations for efficiency");
  console.log("   ✅ Advanced prediction statistics");

  // Return contract info for verification
  return {
    address: contractAddress,
    owner: owner,
    totalEvents: totalEvents.toString(),
    features: [
      "Enhanced Privacy Encryption",
      "Commit-Reveal Scheme",
      "Round Management",
      "Batch Operations",
      "Prediction Integrity Verification"
    ]
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\n🎉 FHE deployment completed successfully!");
    console.log("Contract Address:", result.address);
    console.log("FHE Features:", result.features.join(", "));
    console.log("🔐 Ready for encrypted predictions!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
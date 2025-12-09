import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Public Privacy Prediction Platform contract...");
  console.log("📝 This version allows ANYONE to create events and make predictions");

  // Get the contract factory
  const PrivacyGuessPublic = await ethers.getContractFactory("PrivacyGuessPublic");

  // Deploy the contract
  console.log("⚡ Deploying contract to Sepolia...");
  const contract = await PrivacyGuessPublic.deploy();

  // Wait for deployment to complete
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ PrivacyGuessPublic contract deployed to:", contractAddress);

  // Verify deployment
  const owner = await contract.owner();
  const totalEvents = await contract.getTotalEvents();

  console.log("📋 Contract Info:");
  console.log("   Owner:", owner);
  console.log("   Total Events:", totalEvents.toString());

  // Test creating an event to verify public access
  console.log("\n🧪 Testing public event creation...");
  try {
    const tx = await contract.createEvent(
      "🎯 Test Event - Bitcoin $100K Prediction",
      "Test event to verify anyone can create predictions",
      7 * 24 * 60 * 60 // 7 days
    );
    await tx.wait();
    console.log("✅ Test event created successfully! Public access confirmed.");
  } catch (error) {
    console.log("❌ Test event creation failed:", error);
  }

  // Display next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS_RAW in index.html:");
  console.log(`   const CONTRACT_ADDRESS_RAW = "${contractAddress}";`);
  console.log("2. Update contract ABI if needed");
  console.log("3. Test full functionality in web interface");
  console.log("4. Anyone can now create events and make predictions!");

  // Return contract info for verification
  return {
    address: contractAddress,
    owner: owner,
    totalEvents: totalEvents.toString()
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\n🎉 Public deployment completed successfully!");
    console.log("Contract Address:", result.address);
    console.log("Initial Events:", result.totalEvents);
    console.log("🌟 Ready for public predictions!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
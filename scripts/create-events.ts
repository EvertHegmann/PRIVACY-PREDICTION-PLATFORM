import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Creating prediction events for public use...");

  const contractAddress = "0x86EB37C3DC77925812451258e4a7fb63092BB60B";

  // Get the contract instance
  const PrivacyPredictionPlatform = await ethers.getContractFactory("PrivacyPredictionPlatform");
  const contract = PrivacyPredictionPlatform.attach(contractAddress);

  const [deployer] = await ethers.getSigners();
  console.log("📋 Creating events with account:", deployer.address);

  // Check if we're the owner
  const owner = await contract.owner();
  console.log("📋 Contract owner:", owner);

  if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
    console.log("❌ Error: You are not the contract owner");
    console.log("   Your address:", deployer.address);
    console.log("   Owner address:", owner);
    return;
  }

  // Check existing events
  const totalEvents = await contract.getTotalEvents();
  console.log("📊 Current total events:", totalEvents.toString());

  const eventsToCreate = [
    {
      title: "🏆 2026 FIFA World Cup Winner Prediction",
      description: "Predict which team will win the 2026 FIFA World Cup! Your prediction will be encrypted and protected until the tournament ends.",
      duration: 90 * 24 * 60 * 60 // 90 days
    },
    {
      title: "💎 Bitcoin $100K Breakthrough Prediction",
      description: "Will Bitcoin break through $100,000 by the end of 2024? Use FHE encryption technology to protect your prediction.",
      duration: 60 * 24 * 60 * 60 // 60 days
    },
    {
      title: "🎮 Gaming Championship Prediction",
      description: "Predict the outcome of major esports and gaming championships. Your predictions are secured with homomorphic encryption.",
      duration: 30 * 24 * 60 * 60 // 30 days
    }
  ];

  console.log(`🚀 Creating ${eventsToCreate.length} events...`);

  for (let i = 0; i < eventsToCreate.length; i++) {
    const event = eventsToCreate[i];

    try {
      console.log(`\n📝 Creating event ${i + 1}: ${event.title}`);

      const tx = await contract.createEvent(
        event.title,
        event.description,
        event.duration
      );

      console.log("⏳ Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Event created! Block:", receipt.blockNumber);

    } catch (error) {
      console.error(`❌ Failed to create event ${i + 1}:`, error);
    }
  }

  // Check final state
  const finalTotalEvents = await contract.getTotalEvents();
  console.log("\n📊 Final total events:", finalTotalEvents.toString());

  console.log("\n🎉 Event creation completed!");
  console.log("🌟 Users can now make predictions on these events!");
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
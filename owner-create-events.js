// 合约Owner创建事件的脚本
// 在浏览器控制台中运行此脚本（需要owner钱包连接）

async function createPredictionEvents() {
    console.log('🎯 Creating prediction events for public use...');

    // 检查是否连接了钱包
    if (!window.ethereum) {
        console.error('❌ MetaMask not found!');
        return;
    }

    if (!contract) {
        console.error('❌ Contract not loaded!');
        return;
    }

    if (!userAddress) {
        console.error('❌ Wallet not connected!');
        return;
    }

    try {
        // 检查当前用户是否是owner
        const owner = await contract.owner();
        if (userAddress.toLowerCase() !== owner.toLowerCase()) {
            console.error('❌ You are not the contract owner');
            console.log('Your address:', userAddress);
            console.log('Owner address:', owner);
            return;
        }

        console.log('✅ Owner verification passed');

        // 检查现有事件数量
        const totalEvents = await contract.getTotalEvents();
        console.log('📊 Current total events:', totalEvents.toString());

        if (totalEvents.toString() !== '0') {
            console.log('ℹ️ Events already exist, skipping creation');
            return;
        }

        // 要创建的事件列表
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

                console.log('⏳ Transaction sent:', tx.hash);
                const receipt = await tx.wait();
                console.log('✅ Event created! Block:', receipt.blockNumber);

            } catch (error) {
                console.error(`❌ Failed to create event ${i + 1}:`, error);
            }
        }

        // 检查最终状态
        const finalTotalEvents = await contract.getTotalEvents();
        console.log('\n📊 Final total events:', finalTotalEvents.toString());

        console.log('\n🎉 Event creation completed!');
        console.log('🌟 Users can now make predictions on these events!');

        // 刷新页面显示
        await loadEvents();

    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

// 自动执行
createPredictionEvents();
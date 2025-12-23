#!/usr/bin/env ts-node

/**
 * create-fhevm-example - CLI tool to generate standalone FHEVM example repositories
 *
 * Usage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]
 *
 * Example: ts-node scripts/create-fhevm-example.ts privacy-prediction ./my-prediction-platform
 */

import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
enum Color {
  Reset = '\x1b[0m',
  Green = '\x1b[32m',
  Blue = '\x1b[34m',
  Yellow = '\x1b[33m',
  Red = '\x1b[31m',
  Cyan = '\x1b[36m',
}

function log(message: string, color: Color = Color.Reset): void {
  console.log(`${color}${message}${Color.Reset}`);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

// Example configuration interface
interface ExampleConfig {
  contract: string;
  test: string;
  testFixture?: string;
  description: string;
  category: string;
}

// Map of example names to their contract and test paths
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  // Basic Examples
  'fhe-counter': {
    contract: 'contracts/FHECounter.sol',
    test: 'test/Counter.ts',
    description: 'Simple FHE counter demonstrating encrypted arithmetic operations (add, subtract, compare)',
    category: 'Basic - Arithmetic',
  },
  'counter-comparison': {
    contract: 'contracts/Counter.sol',
    test: 'test/Counter.ts',
    description: 'Comparison between regular counter and FHE counter to understand encryption benefits',
    category: 'Basic - Arithmetic',
  },

  // Encryption Examples
  'encryption-single': {
    contract: 'contracts/EncryptionExample.sol',
    test: 'test/FHEExamples.ts',
    description: 'Encrypt single values with input proofs and proper validation',
    category: 'Encryption',
  },
  'encryption-multiple': {
    contract: 'contracts/EncryptionExample.sol',
    test: 'test/FHEExamples.ts',
    description: 'Batch encryption of multiple values with different data types',
    category: 'Encryption',
  },

  // Decryption Examples
  'decryption-user': {
    contract: 'contracts/DecryptionExample.sol',
    test: 'test/FHEExamples.ts',
    description: 'User-only decryption patterns for private data access',
    category: 'Decryption',
  },
  'decryption-public': {
    contract: 'contracts/DecryptionExample.sol',
    test: 'test/FHEExamples.ts',
    description: 'Public decryption with oracle patterns for transparent reveals',
    category: 'Decryption',
  },

  // Access Control Examples
  'access-control': {
    contract: 'contracts/AccessControlExample.sol',
    test: 'test/FHEExamples.ts',
    description: 'FHE.allow and FHE.allowThis patterns for permission management',
    category: 'Access Control',
  },

  // Anti-Patterns
  'anti-patterns': {
    contract: 'contracts/AntiPatterns.sol',
    test: 'test/FHEExamples.ts',
    description: 'Common mistakes with FHE and correct alternatives for each',
    category: 'Best Practices',
  },

  // Advanced Examples
  'privacy-prediction-basic': {
    contract: 'contracts/PrivacyGuess.sol',
    test: 'test/PrivacyGuess.ts',
    description: 'A basic privacy-preserving prediction platform demonstrating confidential voting on future events',
    category: 'Advanced - Prediction Markets',
  },
  'privacy-prediction-fhe': {
    contract: 'contracts/PrivacyGuessFHESimple.sol',
    test: 'test/PrivacyGuessFHESimple.ts',
    description: 'Advanced FHE-based prediction platform with multi-round support and enhanced privacy features',
    category: 'Advanced - Prediction Markets',
  },
};

function copyDirectoryRecursive(source: string, destination: string): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Skip node_modules, artifacts, cache, etc.
      if (['node_modules', 'artifacts', 'cache', 'coverage', 'types', 'dist', '.git'].includes(item)) {
        return;
      }
      copyDirectoryRecursive(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

function getContractName(contractPath: string): string | null {
  const content = fs.readFileSync(contractPath, 'utf-8');
  // Match contract declaration, ignoring comments and ensuring it's followed by 'is' or '{'
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : null;
}

function updateDeployScript(outputDir: string, contractName: string): void {
  const deployDir = path.join(outputDir, 'scripts');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const deployScriptPath = path.join(deployDir, 'deploy.ts');

  const deployScript = `import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ${contractName}...");

  const ${contractName} = await ethers.getContractFactory("${contractName}");
  const contract = await ${contractName}.deploy();

  await contract.deployed();

  console.log("${contractName} deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  fs.writeFileSync(deployScriptPath, deployScript);
}

function updatePackageJson(outputDir: string, exampleName: string, description: string): void {
  const packageJsonPath = path.join(outputDir, 'package.json');

  const packageJson = {
    name: `fhevm-${exampleName}`,
    version: "1.0.0",
    description: description,
    scripts: {
      "compile": "hardhat compile",
      "test": "hardhat test",
      "deploy": "hardhat run scripts/deploy.ts",
      "lint": "eslint . --ext .ts",
      "format": "prettier --write ."
    },
    devDependencies: {
      "@fhevm/solidity": "^0.9.1",
      "@fhevm/hardhat-plugin": "^0.3.0-1",
      "@nomicfoundation/hardhat-toolbox": "^2.0.0",
      "@types/node": "^20.0.0",
      "hardhat": "^2.19.0",
      "typescript": "^5.0.0",
      "ethers": "^5.7.0"
    }
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

function generateReadme(exampleName: string, description: string, contractName: string): string {
  return `# FHEVM Example: ${exampleName}

${description}

## Overview

This example demonstrates how to build a privacy-preserving prediction platform using Fully Homomorphic Encryption (FHE) technology. Users can make encrypted predictions on real-world events while maintaining complete privacy until results are revealed.

## Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager
- **Hardhat**: Ethereum development environment

### Installation

1. **Install dependencies**

   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**

   \`\`\`bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   \`\`\`

3. **Compile and test**

   \`\`\`bash
   npm run compile
   npm run test
   \`\`\`

## Contract

The main contract is \`${contractName}\` located in \`contracts/${contractName}.sol\`.

### Key Features

- **🔐 Encrypted Predictions**: All predictions are encrypted using FHE technology
- **🎯 Confidential Voting**: Users can vote without revealing their choices
- **⛓️ Blockchain Security**: Transparent and verifiable smart contract execution
- **📊 Event Management**: Create and manage prediction events
- **🔓 Reveal Mechanism**: Commit-reveal scheme for result verification

## Testing

Run the test suite:

\`\`\`bash
npm run test
\`\`\`

The tests demonstrate:
- Creating prediction events
- Making encrypted predictions
- Event finalization
- Prediction revelation and verification
- Edge cases and error handling

## Deployment

Deploy to local network:

\`\`\`bash
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
\`\`\`

Deploy to Sepolia:

\`\`\`bash
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
\`\`\`

## Architecture

### Smart Contract Components

1. **Event Management**
   - Create prediction events with title, description, and duration
   - Track event status (active, finalized)
   - Store actual outcomes

2. **Prediction System**
   - Accept encrypted predictions from users
   - Store predictions with timestamps
   - Prevent duplicate predictions per event

3. **Reveal Mechanism**
   - Verify predictions using commit-reveal scheme
   - Calculate correctness after finalization
   - Emit events for transparency

### Privacy Features

- **Encrypted Storage**: Predictions are stored as encrypted hashes
- **Commit-Reveal**: Two-phase protocol ensures prediction integrity
- **Access Control**: Only predictors can reveal their own predictions

## Usage Example

\`\`\`javascript
// Deploy contract
const Contract = await ethers.getContractFactory("${contractName}");
const contract = await Contract.deploy();

// Create an event
const tx = await contract.createEvent(
  "Will Bitcoin reach $100k in 2026?",
  "Predict whether Bitcoin will reach the $100,000 milestone",
  30 * 24 * 60 * 60 // 30 days
);

// Make a prediction
await contract.makePrediction(eventId, true); // true = yes, false = no

// After event ends, finalize with actual outcome
await contract.finalizeEvent(eventId, true);

// Reveal your prediction
await contract.revealPrediction(eventId, true);
\`\`\`

## Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Protocol Examples](https://docs.zama.org/protocol/examples)
- [Zama Developer Resources](https://www.zama.ai/community)

## License

This project is licensed under the MIT License.

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
`;
}

function createExample(exampleName: string, outputDir: string): void {
  const rootDir = path.resolve(__dirname, '..');
  const templateDir = path.join(rootDir.replace(/PrivacyPredictionPlatform.*/, 'fhevm-hardhat-template-main'), 'fhevm-hardhat-template-main');

  // Check if example exists
  if (!EXAMPLES_MAP[exampleName]) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_MAP).map(k => `  - ${k}`).join('\n')}`);
  }

  const example = EXAMPLES_MAP[exampleName];
  const contractPath = path.join(rootDir, example.contract);
  const testPath = path.join(rootDir, example.test);

  // Validate paths exist
  if (!fs.existsSync(contractPath)) {
    error(`Contract not found: ${example.contract}`);
  }
  if (!fs.existsSync(testPath)) {
    info(`Test file will be generated: ${example.test}`);
  }

  info(`Creating FHEVM example: ${exampleName}`);
  info(`Output directory: ${outputDir}`);

  // Step 1: Copy template (if available) or create structure
  log('\n📋 Step 1: Setting up template structure...', Color.Cyan);
  if (fs.existsSync(outputDir)) {
    error(`Output directory already exists: ${outputDir}`);
  }

  if (fs.existsSync(templateDir)) {
    copyDirectoryRecursive(templateDir, outputDir);
    success('Template copied');
  } else {
    // Create basic structure
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'test'), { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'scripts'), { recursive: true });
    success('Basic structure created');
  }

  // Step 2: Copy contract
  log('\n📄 Step 2: Copying contract...', Color.Cyan);
  const contractName = getContractName(contractPath);
  if (!contractName) {
    error('Could not extract contract name from contract file');
  }
  const destContractPath = path.join(outputDir, 'contracts', `${contractName}.sol`);

  fs.copyFileSync(contractPath, destContractPath);
  success(`Contract copied: ${contractName}.sol`);

  // Step 3: Copy test
  log('\n🧪 Step 3: Copying test...', Color.Cyan);
  if (fs.existsSync(testPath)) {
    const destTestPath = path.join(outputDir, 'test', path.basename(testPath));
    fs.copyFileSync(testPath, destTestPath);
    success(`Test copied: ${path.basename(testPath)}`);
  } else {
    info('Test file not found, skipping...');
  }

  // Step 4: Update configuration files
  log('\n⚙️  Step 4: Updating configuration...', Color.Cyan);
  updateDeployScript(outputDir, contractName);
  updatePackageJson(outputDir, exampleName, example.description);
  success('Configuration updated');

  // Step 5: Generate README
  log('\n📝 Step 5: Generating README...', Color.Cyan);
  const readme = generateReadme(exampleName, example.description, contractName);
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
  success('README.md generated');

  // Final summary
  log('\n' + '='.repeat(60), Color.Green);
  success(`FHEVM example "${exampleName}" created successfully!`);
  log('='.repeat(60), Color.Green);

  log('\n📦 Next steps:', Color.Yellow);
  log(`  cd ${path.relative(process.cwd(), outputDir)}`);
  log('  npm install');
  log('  npm run compile');
  log('  npm run test');

  log('\n🎉 Happy coding with FHEVM!', Color.Cyan);
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('FHEVM Prediction Platform Example Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]\n');
    log('Available examples:', Color.Yellow);
    Object.entries(EXAMPLES_MAP).forEach(([name, info]) => {
      log(`  ${name}`, Color.Green);
      log(`    ${info.description}`, Color.Reset);
    });
    log('\nExample:', Color.Yellow);
    log('  ts-node scripts/create-fhevm-example.ts privacy-prediction-basic ./my-prediction-platform\n');
    process.exit(0);
  }

  const exampleName = args[0];
  const outputDir = args[1] || path.join(process.cwd(), 'output', `fhevm-${exampleName}`);

  createExample(exampleName, outputDir);
}

main();

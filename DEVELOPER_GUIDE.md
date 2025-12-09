# Developer Guide - Privacy Prediction Platform

## Table of Contents

1. [Overview](#overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Adding New Examples](#adding-new-examples)
5. [Updating Dependencies](#updating-dependencies)
6. [Testing Workflow](#testing-workflow)
7. [Documentation Generation](#documentation-generation)
8. [Deployment Process](#deployment-process)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Overview

The Privacy Prediction Platform is a comprehensive FHEVM Example Hub designed for developers building privacy-preserving smart contracts. This guide helps you:

- Add new example contracts
- Update dependencies
- Maintain and extend the project
- Generate documentation
- Deploy examples
- Optimize performance

---

## Development Environment Setup

### Prerequisites

- **Node.js** v20 or higher
- **npm** v10 or higher
- **Git** for version control
- **Hardhat** development environment
- **TypeScript** knowledge

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/EvertHegmann/PrivacyPredictionPlatform.git
cd PrivacyPredictionPlatform

# Install dependencies
npm install

# Verify installation
npm run compile
npm run test
```

### IDE Configuration

#### VSCode Recommended Extensions
- Solidity (by Juan Blanco)
- Hardhat for Visual Studio Code
- TypeScript Vue Plugin
- Prettier - Code formatter
- ESLint

#### VSCode Settings (`.vscode/settings.json`)
```json
{
  "[solidity]": {
    "editor.defaultFormatter": "JuanBlanco.solidity",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "editor.wordWrap": "on"
}
```

---

## Project Structure

### Directory Layout

```
PrivacyPredictionPlatform/
│
├── contracts/                          # Smart contracts
│   ├── PrivacyGuess.sol               # Basic implementation
│   └── PrivacyGuessFHESimple.sol      # FHE-enhanced implementation
│
├── test/                               # Test suites
│   ├── PrivacyGuess.ts                # 60 basic tests
│   └── PrivacyGuessFHESimple.ts       # 71 FHE tests
│
├── scripts/                            # Automation tools
│   ├── create-fhevm-example.ts        # Repository generator
│   ├── generate-docs.ts               # Documentation generator
│   ├── deploy-fhe.ts                  # FHE deployment
│   ├── deploy-simple.ts               # Simple deployment
│   └── deploy-public.ts               # Public version deployment
│
├── docs/                               # Auto-generated documentation
│   ├── SUMMARY.md                     # GitBook TOC
│   ├── privacy-prediction-basic.md    # Basic docs
│   └── privacy-prediction-fhe.md      # FHE docs
│
├── public/                             # Frontend assets
├── README.md                           # Main documentation
├── COMPETITION_README.md               # Competition guide
├── DEVELOPER_GUIDE.md                  # This file
├── CONTRIBUTING.md                     # Contribution guidelines
├── API_DOCUMENTATION.md                # API reference
├── TEST_COVERAGE_SUMMARY.md            # Test breakdown
├── TEST_ENHANCEMENT_REPORT.md          # Test improvements
├── LICENSE                             # BSD-3-Clause-Clear
├── package.json                        # Dependencies
├── hardhat.config.ts                   # Hardhat config
├── tsconfig.json                       # TypeScript config
└── .gitignore                          # Git ignore rules
```

### Key Files Purpose

- **contracts/** - Solidity smart contracts (source of truth)
- **test/** - TypeScript test suites (131+ comprehensive tests)
- **scripts/** - Automation CLI tools (TypeScript)
- **docs/** - Auto-generated documentation (GitBook format)
- **package.json** - npm dependencies and scripts
- **hardhat.config.ts** - Hardhat development configuration

---

## Adding New Examples

### Step 1: Create Smart Contract

**Location:** `contracts/<category>/YourExample.sol`

**Template:**
```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";

/// @title Your Example Title
/// @notice Detailed description of what this contract demonstrates
contract YourExample {
  /// @notice Brief description
  function yourFunction() external {
    // Implementation
  }
}
```

**Best Practices:**
- Include SPDX license identifier
- Add NatSpec comments (///)
- Use descriptive function names
- Document parameters and return values
- Show both correct and incorrect usage patterns

### Step 2: Create Comprehensive Tests

**Location:** `test/<category>/YourExample.ts`

**Template:**
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Test suite for Your Example
 *
 * This test demonstrates:
 * - Pattern 1
 * - Pattern 2
 */
describe("Your Example", function () {
  let contract: YourExample;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const YourExample = await ethers.getContractFactory("YourExample");
    contract = await YourExample.deploy();
    await contract.waitForDeployment();
  });

  describe("Basic Functionality", function () {
    // ✅ Test: Success case
    it("Should perform action correctly", async function () {
      await expect(contract.yourFunction())
        .to.emit(contract, "YourEvent");
    });

    // ❌ Test: Error case
    it("Should reject invalid input", async function () {
      await expect(contract.invalidFunction())
        .to.be.revertedWith("Error message");
    });
  });
});
```

**Testing Guidelines:**
- Use ✅ for passing cases, ❌ for failing cases
- Include JSDoc comments above test groups
- Test both happy and error paths
- Include edge cases
- Document expected behavior
- Minimum: 10 tests per contract

### Step 3: Update Automation Scripts

**File:** `scripts/create-fhevm-example.ts`

Add to `EXAMPLES_MAP`:
```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'your-example': {
    contract: 'contracts/<category>/YourExample.sol',
    test: 'test/<category>/YourExample.ts',
    description: 'Clear description of what this demonstrates',
    category: 'Category Name',
  },
};
```

**File:** `scripts/generate-docs.ts`

Add to `EXAMPLES_CONFIG`:
```typescript
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'your-example': {
    title: 'Your Example Title',
    description: 'Detailed description explaining the concept',
    contract: 'contracts/<category>/YourExample.sol',
    test: 'test/<category>/YourExample.ts',
    output: 'docs/your-example.md',
    category: 'Category Name',
  },
};
```

### Step 4: Generate Documentation

```bash
# Generate for your example
npx ts-node scripts/generate-docs.ts your-example

# Verify output
cat docs/your-example.md
```

### Step 5: Test Everything

```bash
# Compile
npm run compile

# Test in base template
npm run test

# Test as standalone
npx ts-node scripts/create-fhevm-example.ts your-example ./test-output
cd test-output
npm install
npm run test
```

### Step 6: Update Documentation

Update `README.md` to include your new example:
```markdown
## Available Examples

- `your-example-name` - Brief description of what it demonstrates
```

---

## Updating Dependencies

### Checking for Updates

```bash
# Check outdated packages
npm outdated

# List security vulnerabilities
npm audit
```

### Updating FHEVM Library

When new `@fhevm/solidity` version is released:

#### 1. Update Base Template
```bash
# Update version
npm install @fhevm/solidity@latest

# Verify it compiles
npm run compile

# Run tests
npm run test
```

#### 2. Test All Examples
```bash
# Test each example
for example in privacy-prediction-basic privacy-prediction-fhe; do
  npx ts-node scripts/create-fhevm-example.ts $example ./test-$example
  cd ./test-$example
  npm install
  npm run test
  cd ..
done
```

#### 3. Update Documentation

If breaking changes:
```bash
# Regenerate all docs
npx ts-node scripts/generate-docs.ts --all

# Update examples as needed
```

#### 4. Update README

```bash
# Update version references in README.md
# Update FHEVM documentation links if needed
```

### Safe Update Process

1. **Always test first** - Never update main branch without testing
2. **Test in isolation** - Update and test one contract at a time
3. **Check for breaking changes** - Review release notes
4. **Update documentation** - Reflect any API changes
5. **Verify all examples** - Regenerate to catch issues

---

## Testing Workflow

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- test/PrivacyGuess.ts

# Run with gas reporting
REPORT_GAS=true npm run test

# Run specific test category
npm run test -- --grep "Access Control"
```

### Test-Driven Development (TDD)

1. **Write test first** - Define expected behavior
2. **Run test** - Watch it fail
3. **Write minimal code** - Make test pass
4. **Refactor** - Improve implementation
5. **Repeat** - For each feature

Example:
```bash
# Create test for new feature
# (write it in test file)

# Run test (fails)
npm run test -- --grep "My New Feature"

# Implement feature in contract

# Run test (passes)
npm run test -- --grep "My New Feature"

# Run full suite to ensure no regressions
npm run test
```

### Debugging Tests

```bash
# Run with verbose output
npm run test -- --reporter spec

# Run single test
npm run test -- --grep "exact test name"

# Run tests in specific file with logging
npx hardhat test test/PrivacyGuess.ts --reporter spec

# Check gas usage
REPORT_GAS=true npm run test
```

---

## Documentation Generation

### Automatic Documentation

Documentation is auto-generated from:
1. Contract NatSpec comments
2. Test code and comments
3. Configuration in `scripts/generate-docs.ts`

### Generate Docs

```bash
# Generate for single example
npx ts-node scripts/generate-docs.ts privacy-prediction-basic

# Generate all
npx ts-node scripts/generate-docs.ts --all

# Update GitBook index
# (automatic with --all)
```

### Manual Documentation

For additional documentation:
1. Create markdown files in `docs/`
2. Update `docs/SUMMARY.md` table of contents
3. Use GitBook formatting for consistency

### GitBook Integration

To serve documentation locally:
```bash
# Install GitBook CLI
npm install -g gitbook-cli

# Serve documentation
cd docs
gitbook serve

# Access at http://localhost:4000
```

---

## Deployment Process

### Local Hardhat Network

```bash
# Start local node
npx hardhat node

# In another terminal, deploy
npx hardhat run scripts/deploy-fhe.ts --network localhost
```

### Sepolia Testnet

```bash
# Set environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy
npm run deploy

# Verify contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Deployment Checklist

- [ ] Tests pass locally
- [ ] Contracts compile without warnings
- [ ] Gas usage is optimized
- [ ] Documentation is updated
- [ ] Contract is audited (if needed)
- [ ] Environment variables are set
- [ ] Network is correct
- [ ] Verify after deployment

---

## Troubleshooting

### Common Issues

#### 1. Compilation Errors

```bash
# Clean and rebuild
npm run clean
npm run compile

# Check Solidity version
# (should be ^0.8.24)

# Check imports
# (all imports should be from @fhevm/solidity)
```

#### 2. Test Failures

```bash
# Check for gas issues
REPORT_GAS=true npm run test

# Run specific failing test
npm run test -- --grep "failing test name"

# Clear cache
npx hardhat clean
npm run test
```

#### 3. Deployment Issues

```bash
# Check gas price
npx hardhat run scripts/deploy.ts --network sepolia

# Check balance
# (ensure account has sufficient funds)

# Check network config
# (verify in hardhat.config.ts)
```

#### 4. Documentation Generation Fails

```bash
# Check paths are correct
# (relative to project root)

# Verify contract exists
ls contracts/YourExample.sol

# Verify test exists
ls test/YourExample.ts

# Check configuration
# (EXAMPLES_CONFIG in generate-docs.ts)
```

### Debug Mode

```bash
# Enable debug output
DEBUG=* npm run test

# Enable hardhat logging
npm run test -- --reporter spec

# Check contract state
npx hardhat console --network localhost
```

---

## Performance Optimization

### Gas Optimization

1. **Monitor gas usage**
   ```bash
   REPORT_GAS=true npm run test
   ```

2. **Identify hotspots**
   - Review gas costs in test output
   - Focus on frequently-called functions

3. **Optimize code**
   - Minimize storage writes
   - Combine operations when possible
   - Use efficient data structures

### Smart Contract Optimization Tips

```solidity
// ❌ Bad: Multiple storage writes
function addTwo(uint256 a, uint256 b) external {
  counter += a;
  counter += b;
}

// ✅ Good: Single storage write
function addTwo(uint256 a, uint256 b) external {
  counter += (a + b);
}
```

### Testing Performance

```bash
# Benchmark gas usage
REPORT_GAS=true npm run test

# Track gas trends
# (save reports and compare)
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run compile
      - run: npm run test
```

---

## Best Practices

### Code Style

- Use TypeScript for scripts
- Follow Solidity style guide
- Include comments for complex logic
- Use descriptive variable names
- Avoid magic numbers

### Testing

- Write tests before implementation (TDD)
- Test both success and failure cases
- Include edge cases
- Use meaningful test names
- Keep tests independent

### Documentation

- Write comprehensive comments
- Include usage examples
- Document edge cases
- Keep README updated
- Generate docs automatically

### Version Control

- Commit frequently with clear messages
- Create branches for new features
- Keep commits focused and small
- Test before committing
- Use conventional commits

### Security

- Review code before deployment
- Use hardhat-plugin security checks
- Validate all inputs
- Test access control thoroughly
- Keep dependencies updated

---

## Useful Commands Reference

```bash
# Development
npm run compile              # Compile contracts
npm run test                 # Run tests
npm run node                 # Start local node
npm run clean                # Clean artifacts

# Automation
npm run create-example       # Generate example repo
npm run generate-docs        # Generate documentation
npm run generate-all-docs    # Generate all docs

# Deployment
npm run deploy               # Deploy to Sepolia
npx hardhat verify           # Verify contract

# Maintenance
npm audit                    # Check vulnerabilities
npm outdated                 # Check for updates
npm update                   # Update packages
```

---

## Getting Help

### Resources

- **FHEVM Docs**: https://docs.zama.ai/fhevm
- **Hardhat Docs**: https://hardhat.org/docs
- **GitHub Issues**: Report bugs here
- **Discord**: https://discord.com/invite/zama
- **Forum**: https://www.zama.ai/community

### Contributing

See `CONTRIBUTING.md` for guidelines on:
- Reporting issues
- Submitting pull requests
- Code review process
- Development standards

---

## Conclusion

This guide covers the essential workflows for developing with the Privacy Prediction Platform. For questions or issues, refer to:

1. **CONTRIBUTING.md** - Contribution guidelines
2. **scripts/README.md** - Automation tools documentation
3. **TEST_COVERAGE_SUMMARY.md** - Testing details
4. **API_DOCUMENTATION.md** - Contract API reference

Happy developing! 🚀

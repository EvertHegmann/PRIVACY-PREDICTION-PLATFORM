# Automation Scripts Documentation

This directory contains TypeScript-based CLI tools for generating standalone FHEVM example repositories and auto-generating documentation.

## Quick Reference

### Create Standalone Examples

```bash
# Generate example repository
npx ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]

# Available examples
npx ts-node scripts/create-fhevm-example.ts --help
```

### Generate Documentation

```bash
# Generate single example docs
npx ts-node scripts/generate-docs.ts <example-name>

# Generate all documentation
npx ts-node scripts/generate-docs.ts --all

# View available examples
npx ts-node scripts/generate-docs.ts --help
```

## Scripts Overview

### create-fhevm-example.ts

Generates a complete standalone Hardhat-based FHEVM example repository.

#### Purpose

Creates self-contained example repositories that developers can:
- Clone and customize
- Use as learning resources
- Deploy independently
- Integrate into their projects

#### Usage

```bash
ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]
```

#### Parameters

- `<example-name>` *(required)* - Name of the example to generate
  - Format: kebab-case (e.g., `privacy-prediction-basic`)
  - Must exist in `EXAMPLES_MAP`
  - Run with `--help` to see all available examples

- `[output-dir]` *(optional)* - Output directory for generated repository
  - Default: `./output/fhevm-{example-name}`
  - Will fail if directory already exists
  - Creates parent directories as needed

#### Examples

```bash
# Generate with default output directory
npx ts-node scripts/create-fhevm-example.ts privacy-prediction-basic

# Generate with custom output directory
npx ts-node scripts/create-fhevm-example.ts privacy-prediction-basic ./my-examples/prediction-platform

# Generate and immediately test
npx ts-node scripts/create-fhevm-example.ts privacy-prediction-fhe ./test-fhe
cd test-fhe
npm install
npm run test
```

#### Generated Structure

Each generated repository includes:

```
output-dir/
├── contracts/
│   └── {ContractName}.sol          # Your contract
├── test/
│   └── {TestFileName}.ts           # Your tests
├── scripts/
│   └── deploy.ts                   # Deployment script
├── hardhat.config.ts               # Hardhat configuration
├── package.json                    # Dependencies and scripts
├── README.md                       # Auto-generated documentation
├── tsconfig.json                   # TypeScript configuration
└── [other template files]          # Remaining template files
```

#### Features

1. **Template Cloning**
   - Copies base template from `fhevm-hardhat-template`
   - Skips unnecessary directories (node_modules, artifacts, cache)
   - Preserves all configuration files

2. **Smart File Placement**
   - Copies contract to `contracts/{ContractName}.sol`
   - Copies test to `test/{TestFileName}.ts`
   - Updates package.json with example-specific information

3. **Auto-Configuration**
   - Extracts contract name from Solidity file
   - Generates appropriate deployment script
   - Updates package.json with example metadata
   - Creates README with usage instructions

4. **Validation**
   - Verifies example exists in EXAMPLES_MAP
   - Validates contract and test file paths
   - Checks for contract name extraction
   - Prevents overwriting existing directories

#### Adding New Examples

1. Add contract file to `contracts/` with appropriate naming
2. Add test file to `test/` with matching structure
3. Update `EXAMPLES_MAP` in this script:

```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'your-example-name': {
    contract: 'contracts/path/YourContract.sol',
    test: 'test/path/YourContract.ts',
    description: 'Brief description of what this example demonstrates',
    category: 'Category Name',
  },
  // ... other examples
};
```

4. Run generate-docs.ts to create documentation
5. Test with `create-fhevm-example.ts`

#### Color Output

The script uses color-coded output for clarity:

- 🟢 **Green** - Successful operations
- 🔵 **Blue** - Informational messages
- 🟡 **Yellow** - Important notes and next steps
- 🔴 **Red** - Errors and failures

---

### generate-docs.ts

Auto-generates GitBook-compatible documentation from contract source and test code.

#### Purpose

Creates professional documentation by:
- Extracting contract code with syntax highlighting
- Including test examples showing usage patterns
- Formatting for GitBook compatibility
- Organizing documentation by category
- Maintaining a central index (SUMMARY.md)

#### Usage

```bash
ts-node scripts/generate-docs.ts <example-name> | --all
```

#### Parameters

- `<example-name>` *(optional)* - Name of example to document
  - Format: kebab-case (e.g., `privacy-prediction-basic`)
  - Must exist in `EXAMPLES_CONFIG`
  - Run with `--help` to see all available examples

- `--all` *(optional)* - Generate documentation for all examples
  - Creates all markdown files at once
  - Updates SUMMARY.md after all generations

#### Examples

```bash
# Generate docs for specific example
npx ts-node scripts/generate-docs.ts privacy-prediction-basic

# Generate all documentation
npx ts-node scripts/generate-docs.ts --all

# View available examples
npx ts-node scripts/generate-docs.ts --help
```

#### Output Files

Generated documentation is placed in `docs/` directory:

```
docs/
├── SUMMARY.md                      # GitBook table of contents
├── privacy-prediction-basic.md     # Example documentation
└── privacy-prediction-fhe.md       # Example documentation
```

#### Documentation Format

Generated markdown files include:

1. **Title & Description**
   ```markdown
   # Example Title
   Description of what this example demonstrates
   ```

2. **Key Concepts**
   ```markdown
   ## Key Concepts
   - Concept 1
   - Concept 2
   - ...
   ```

3. **File Placement Instructions**
   ```markdown
   {% hint style="info" %}
   To run this example correctly...
   {% endhint %}
   ```

4. **Code Tabs**
   - Contract code tab with Solidity syntax highlighting
   - Test code tab with TypeScript syntax highlighting

5. **Usage Patterns**
   - Real-world examples of how to use the contract
   - JavaScript/TypeScript code snippets

6. **Privacy & Security Notes**
   ```markdown
   ## Privacy & Security
   - Security consideration 1
   - Privacy feature 1
   ```

#### GitBook Compatibility

The generated markdown uses GitBook-specific syntax:

- `{% hint %}` blocks for callouts
- `{% tabs %}` for code organization
- Proper heading hierarchy for navigation
- Compatible with GitBook's table of contents generation

To view locally:

```bash
# Install GitBook CLI (optional)
npm install -g gitbook-cli

# Serve documentation
cd docs
gitbook serve

# Access at http://localhost:4000
```

#### SUMMARY.md Management

The script maintains a central table of contents:

```markdown
# Table of Contents

## Overview
- [Introduction](README.md)

## Basic Examples
- [FHE Counter](fhe-counter.md)
- [Encrypt Single Value](fhe-encrypt-single-value.md)

## Advanced Examples
- [Privacy Prediction Platform - Basic](privacy-prediction-basic.md)
- [Privacy Prediction Platform - FHE](privacy-prediction-fhe.md)
```

Features:
- Auto-creates if missing
- Maintains category organization
- Prevents duplicate entries
- Updates incrementally

#### Adding New Examples

1. Create contract and test files
2. Add configuration to `EXAMPLES_CONFIG` in this script:

```typescript
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'your-example': {
    title: 'Your Example Title',
    description: 'Description of what this demonstrates',
    contract: 'contracts/path/YourContract.sol',
    test: 'test/path/YourContract.ts',
    output: 'docs/your-example.md',
    category: 'Category Name',
  },
  // ... other examples
};
```

3. Run: `npx ts-node scripts/generate-docs.ts your-example`
4. Documentation appears in `docs/your-example.md`
5. SUMMARY.md is automatically updated

#### Color Output

- 🟢 **Green** - Successful generations
- 🔵 **Blue** - Status information
- 🟡 **Yellow** - Warnings and notes
- 🔴 **Red** - Errors

---

## Configuration

### Example Configuration Structure

Both scripts use similar configuration objects:

```typescript
interface ExampleConfig {
  // Script-specific
  contract: string;        // Path to Solidity contract
  test: string;           // Path to TypeScript test
  description: string;    // Brief description

  // Documentation-specific (generate-docs only)
  title: string;          // Full title for docs
  output: string;         // Output markdown path
  category: string;       // Documentation category
}
```

### Adding Examples

#### Step 1: Create Contract & Tests

```solidity
// contracts/examples/MyExample.sol
contract MyExample {
  // Implementation
}
```

```typescript
// test/examples/MyExample.ts
describe("My Example", () => {
  // Tests
});
```

#### Step 2: Update create-fhevm-example.ts

```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'my-example': {
    contract: 'contracts/examples/MyExample.sol',
    test: 'test/examples/MyExample.ts',
    description: 'This example demonstrates...',
    category: 'Category Name',
  },
};
```

#### Step 3: Update generate-docs.ts

```typescript
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'my-example': {
    title: 'My Example Title',
    description: 'Detailed description...',
    contract: 'contracts/examples/MyExample.sol',
    test: 'test/examples/MyExample.ts',
    output: 'docs/my-example.md',
    category: 'Category Name',
  },
};
```

#### Step 4: Test & Generate

```bash
# Generate standalone repository
npx ts-node scripts/create-fhevm-example.ts my-example ./test-output
cd test-output && npm install && npm test

# Generate documentation
npx ts-node scripts/generate-docs.ts my-example

# View at docs/my-example.md
```

---

## Workflow

### Development Workflow

1. **Create Contract**
   - Write Solidity contract in `contracts/`
   - Include comprehensive comments
   - Document FHE concepts and patterns

2. **Write Tests**
   - Create test file in `test/`
   - Include both success and error cases
   - Use ✅/❌ markers for clarity
   - Document assumptions

3. **Update Scripts**
   - Add to `EXAMPLES_MAP` in `create-fhevm-example.ts`
   - Add to `EXAMPLES_CONFIG` in `generate-docs.ts`

4. **Generate Documentation**
   ```bash
   npx ts-node scripts/generate-docs.ts your-example
   ```

5. **Test Standalone Repository**
   ```bash
   npx ts-node scripts/create-fhevm-example.ts your-example ./test-output
   cd test-output
   npm install
   npm run compile
   npm run test
   ```

6. **Verify Documentation**
   - Check `docs/your-example.md`
   - Verify SUMMARY.md updated
   - Test GitBook rendering (optional)

### Bulk Operations

#### Generate All Documentation

```bash
npx ts-node scripts/generate-docs.ts --all
```

#### Generate Multiple Examples

```bash
for example in privacy-prediction-basic privacy-prediction-fhe; do
  npx ts-node scripts/create-fhevm-example.ts $example ./examples/$example
  cd ./examples/$example
  npm install && npm run test
  cd ../..
done
```

#### Update After Dependency Changes

```bash
# Update base template
cd fhevm-hardhat-template
npm install @fhevm/solidity@latest
npm run test

# Regenerate key examples
npx ts-node scripts/create-fhevm-example.ts privacy-prediction-basic ./test-basic
cd test-basic && npm install && npm test

# Regenerate documentation
npx ts-node scripts/generate-docs.ts --all
```

---

## Troubleshooting

### create-fhevm-example.ts Issues

#### "Unknown example: xyz"
- Example name not in `EXAMPLES_MAP`
- Run `--help` to see available examples
- Verify naming matches (kebab-case, e.g., `my-example`)

#### "Contract not found: path/to/file.sol"
- Specified contract file doesn't exist
- Check path in EXAMPLES_MAP
- Verify file exists relative to script directory

#### "Output directory already exists"
- Specified output directory already has files
- Remove directory or use different path
- Try: `rm -rf ./output-dir` then retry

#### "Could not extract contract name"
- Contract declaration not found in file
- File might not be valid Solidity
- Check contract syntax: `contract Name { ... }`

### generate-docs.ts Issues

#### "Unknown example: xyz"
- Example name not in `EXAMPLES_CONFIG`
- Run `--help` to see available examples
- Verify naming is consistent

#### "File not found: path/to/file.ts"
- Specified test file doesn't exist
- Script proceeds without test code if missing
- Check path in EXAMPLES_CONFIG

#### SUMMARY.md Not Updating
- Check SUMMARY.md file permissions
- Ensure `docs/` directory exists
- Verify example not already in SUMMARY.md

#### GitBook Preview Not Working
- Ensure markdown is valid
- Check for special characters
- Verify file paths in tabs
- Try: `gitbook install` then `gitbook serve`

---

## Best Practices

### Script Usage

✅ **DO:**
- Use provided npm scripts when available
- Check output for errors and warnings
- Test generated repositories independently
- Verify documentation before publishing
- Keep EXAMPLES_MAP and EXAMPLES_CONFIG in sync

❌ **DON'T:**
- Manually edit generated README files
- Mix spaces and tabs in YAML/JSON
- Forget to test generated examples
- Leave intermediate output directories
- Update scripts without testing

### Documentation Quality

✅ **DO:**
- Include clear contract descriptions
- Document FHE concepts used
- Show both correct and incorrect usage
- Explain privacy implications
- Provide real-world examples

❌ **DON'T:**
- Assume reader knowledge
- Skip error case examples
- Leave uncommented code
- Create overly long documentation
- Use vague descriptions

---

## Performance Tips

### Optimization

1. **Reduce Template Size**
   - Remove unused node_modules before cloning
   - Delete unnecessary artifacts
   - Keep template minimal

2. **Batch Operations**
   ```bash
   # Faster than individual generates
   npx ts-node scripts/generate-docs.ts --all
   ```

3. **Caching**
   - First-time generation is slowest
   - Subsequent runs use cached data
   - Clear cache: `rm -rf node_modules/.cache`

### Monitoring

Check script performance:
```bash
# Time example generation
time npx ts-node scripts/create-fhevm-example.ts privacy-prediction-basic ./test

# Profile with Node
node --prof node_modules/.bin/ts-node scripts/generate-docs.ts --all
```

---

## Support

For issues or questions:
- Check this README first
- Review example configurations
- Run with `--help` for options
- Check error messages for guidance
- Verify file paths and permissions

---

**Built for Zama Bounty Track December 2025**

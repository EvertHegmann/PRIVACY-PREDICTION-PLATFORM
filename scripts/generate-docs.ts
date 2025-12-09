#!/usr/bin/env ts-node

/**
 * generate-docs - Generates GitBook-formatted documentation from contracts and tests
 *
 * Usage: ts-node scripts/generate-docs.ts <example-name> [options]
 *
 * Example: ts-node scripts/generate-docs.ts privacy-prediction-basic --output docs/
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

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

// Documentation configuration interface
interface DocsConfig {
  title: string;
  description: string;
  contract: string;
  test: string;
  output: string;
  category: string;
}

// Generate documentation options
interface GenerateDocsOptions {
  noSummary?: boolean;
}

// Example configurations
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'privacy-prediction-basic': {
    title: 'Privacy Prediction Platform - Basic',
    description: 'This example demonstrates how to build a confidential prediction platform using FHEVM, allowing users to make encrypted predictions on future events.',
    contract: 'contracts/PrivacyGuess.sol',
    test: 'test/PrivacyGuess.ts',
    output: 'docs/privacy-prediction-basic.md',
    category: 'Advanced - Prediction Markets',
  },
  'privacy-prediction-fhe': {
    title: 'Privacy Prediction Platform - FHE Enhanced',
    description: 'This example shows an advanced FHE-based prediction platform with multi-round support, enhanced privacy features, and batch operations.',
    contract: 'contracts/PrivacyGuessFHESimple.sol',
    test: 'test/PrivacyGuessFHESimple.ts',
    output: 'docs/privacy-prediction-fhe.md',
    category: 'Advanced - Prediction Markets',
  }
};

function readFile(filePath: string): string {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function getContractName(content: string): string {
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : 'Contract';
}

function extractDescription(content: string): string {
  // Extract description from first multi-line comment or @notice
  const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  const noticeMatch = content.match(/@notice\s+(.+)/);

  return commentMatch ? commentMatch[1] : (noticeMatch ? noticeMatch[1] : '');
}

function generateGitBookMarkdown(config: DocsConfig, contractContent: string, testContent: string): string {
  const contractName = getContractName(contractContent);
  const description = config.description || extractDescription(contractContent);

  let markdown = `# ${config.title}\n\n${description}\n\n`;

  // Add key concepts section
  markdown += `## Key Concepts\n\n`;
  markdown += `This example demonstrates:\n\n`;
  markdown += `- **Encrypted Predictions**: Using FHE to keep predictions private until reveal\n`;
  markdown += `- **Commit-Reveal Scheme**: Two-phase protocol for prediction integrity\n`;
  markdown += `- **Event Management**: Creating and managing prediction events\n`;
  markdown += `- **Access Control**: Proper permission handling for decryption\n`;
  markdown += `- **Result Verification**: Transparent verification after event finalization\n\n`;

  // Add hint block
  markdown += `{% hint style="info" %}\n`;
  markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
  markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
  markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
  markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
  markdown += `{% endhint %}\n\n`;

  // Add tabs for contract and test
  markdown += `{% tabs %}\n\n`;

  // Contract tab
  markdown += `{% tab title="${contractName}.sol" %}\n\n`;
  markdown += `\`\`\`solidity\n`;
  markdown += contractContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  // Test tab (if exists)
  if (testContent) {
    const testFileName = path.basename(config.test);
    markdown += `{% tab title="${testFileName}" %}\n\n`;
    markdown += `\`\`\`typescript\n`;
    markdown += testContent;
    markdown += `\n\`\`\`\n\n`;
    markdown += `{% endtab %}\n\n`;
  }

  markdown += `{% endtabs %}\n\n`;

  // Add usage section
  markdown += `## Usage Patterns\n\n`;
  markdown += `### Creating a Prediction Event\n\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `const tx = await contract.createEvent(\n`;
  markdown += `  "Will Bitcoin reach $100k in 2026?",\n`;
  markdown += `  "Predict whether Bitcoin will reach the $100,000 milestone",\n`;
  markdown += `  30 * 24 * 60 * 60 // 30 days\n`;
  markdown += `);\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Making an Encrypted Prediction\n\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `// Make a prediction (true = yes, false = no)\n`;
  markdown += `await contract.makePrediction(eventId, true);\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `### Finalizing and Revealing\n\n`;
  markdown += `\`\`\`javascript\n`;
  markdown += `// After event ends, finalize with actual outcome\n`;
  markdown += `await contract.finalizeEvent(eventId, true);\n\n`;
  markdown += `// Reveal your prediction\n`;
  markdown += `await contract.revealPrediction(eventId, true);\n`;
  markdown += `\`\`\`\n\n`;

  // Add privacy considerations
  markdown += `## Privacy & Security\n\n`;
  markdown += `- **Encrypted Storage**: Predictions are stored as hashed commitments\n`;
  markdown += `- **Integrity Verification**: Commit-reveal ensures predictions can't be changed\n`;
  markdown += `- **Access Control**: Only predictors can reveal their own predictions\n`;
  markdown += `- **Transparent Results**: Event outcomes and verification are on-chain\n\n`;

  return markdown;
}

function updateSummary(exampleName: string, config: DocsConfig): void {
  const summaryPath = path.join(process.cwd(), 'docs', 'SUMMARY.md');

  if (!fs.existsSync(summaryPath)) {
    log('Creating new SUMMARY.md', Color.Yellow);
    const summary = `# Table of Contents\n\n## Overview\n\n- [Introduction](README.md)\n\n`;
    fs.writeFileSync(summaryPath, summary);
  }

  const summary = fs.readFileSync(summaryPath, 'utf-8');
  const outputFileName = path.basename(config.output);
  const linkText = config.title;
  const link = `- [${linkText}](${outputFileName})`;

  // Check if already in summary
  if (summary.includes(outputFileName)) {
    info('Example already in SUMMARY.md');
    return;
  }

  // Add to appropriate category
  const categoryHeader = `## ${config.category}`;
  let updatedSummary: string;

  if (summary.includes(categoryHeader)) {
    // Add under existing category
    const lines = summary.split('\n');
    const categoryIndex = lines.findIndex(line => line.trim() === categoryHeader);

    // Find next category or end
    let insertIndex = categoryIndex + 1;
    while (insertIndex < lines.length && !lines[insertIndex].startsWith('##')) {
      if (lines[insertIndex].trim() === '') {
        break;
      }
      insertIndex++;
    }

    lines.splice(insertIndex, 0, link);
    updatedSummary = lines.join('\n');
  } else {
    // Add new category
    updatedSummary = summary.trim() + `\n\n${categoryHeader}\n\n${link}\n`;
  }

  fs.writeFileSync(summaryPath, updatedSummary);
  success('Updated SUMMARY.md');
}

function generateDocs(exampleName: string, options: GenerateDocsOptions = {}): void {
  const config = EXAMPLES_CONFIG[exampleName];

  if (!config) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_CONFIG).map(k => `  - ${k}`).join('\n')}`);
  }

  info(`Generating documentation for: ${config.title}`);

  // Read contract file
  const contractContent = readFile(config.contract);

  // Try to read test file
  let testContent = '';
  try {
    testContent = readFile(config.test);
  } catch (err) {
    info('Test file not found, generating docs without test code');
  }

  // Generate GitBook markdown
  const markdown = generateGitBookMarkdown(config, contractContent, testContent);

  // Write output file
  const outputPath = path.join(process.cwd(), config.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  success(`Documentation generated: ${config.output}`);

  // Update SUMMARY.md
  if (!options.noSummary) {
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Documentation for "${config.title}" generated successfully!`);
  log('='.repeat(60), Color.Green);
}

function generateAllDocs(): void {
  info('Generating documentation for all examples...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    try {
      generateDocs(exampleName, { noSummary: true });
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Failed to generate docs for ${exampleName}: ${errorMessage}`, Color.Red);
      errorCount++;
    }
  }

  // Update summary once at the end
  info('\nUpdating SUMMARY.md...');
  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    const config = EXAMPLES_CONFIG[exampleName];
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Generated ${successCount} documentation files`);
  if (errorCount > 0) {
    log(`Failed: ${errorCount}`, Color.Red);
  }
  log('='.repeat(60), Color.Green);
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('FHEVM Prediction Platform Documentation Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/generate-docs.ts <example-name> | --all\n');
    log('Available examples:', Color.Yellow);
    Object.entries(EXAMPLES_CONFIG).forEach(([name, config]) => {
      log(`  ${name}`, Color.Green);
      log(`    ${config.title} - ${config.category}`, Color.Reset);
    });
    log('\nOptions:', Color.Yellow);
    log('  --all    Generate documentation for all examples');
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/generate-docs.ts privacy-prediction-basic');
    log('  ts-node scripts/generate-docs.ts --all\n');
    process.exit(0);
  }

  if (args[0] === '--all') {
    generateAllDocs();
  } else {
    generateDocs(args[0]);
  }
}

main();

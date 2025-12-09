# Contributing Guidelines

Thank you for your interest in contributing to the Privacy Prediction Platform! This document provides guidelines for contributing to this FHEVM Example Hub.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Report issues in good faith

## How to Contribute

### Reporting Bugs

**Before reporting, please:**
1. Check existing issues
2. Verify the bug is reproducible
3. Note Solidity version and Node.js version

**When reporting, include:**
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs
- Environment details

**Example:**
```markdown
**Title:** makePrediction fails with duplicate error

**Description:**
When calling makePrediction twice on the same event...

**Steps to Reproduce:**
1. Create event
2. Call makePrediction(0, true)
3. Call makePrediction(0, false)

**Expected:** Second call should revert with "Already made prediction"
**Actual:** Transaction succeeds unexpectedly

**Environment:**
- Node.js: v20.10.0
- Solidity: 0.8.24
```

### Suggesting Features

**Before suggesting, consider:**
1. Is this aligned with project goals?
2. Have similar features been discussed?
3. What would be the implementation approach?

**When suggesting, explain:**
- What problem it solves
- How it should work
- Example use case
- Potential implementation approach

### Contributing Code

#### Prerequisites
- Fork the repository
- Clone your fork
- Set up development environment (see DEVELOPER_GUIDE.md)
- Create a feature branch

```bash
git checkout -b feature/your-feature-name
```

#### Development Process

1. **Make Changes**
   - Follow existing code style
   - Write comprehensive tests
   - Update documentation
   - Keep commits focused

2. **Test Locally**
   ```bash
   npm run compile
   npm run test
   REPORT_GAS=true npm run test
   ```

3. **Commit Code**
   - Use descriptive commit messages
   - Follow conventional commits:
     - `feat:` new feature
     - `fix:` bug fix
     - `docs:` documentation
     - `test:` test additions
     - `refactor:` code improvement
     - `perf:` performance improvement

   Example:
   ```
   feat: add multi-round prediction support

   - Implement round advancement mechanism
   - Add round-specific state tracking
   - Include comprehensive tests (8 new tests)
   - Update documentation with examples
   ```

4. **Create Pull Request**
   - Use descriptive title
   - Include summary of changes
   - Link to related issues
   - Explain why changes were made
   - Include any breaking changes

### Pull Request Process

1. **Ensure Quality**
   - [ ] All tests pass: `npm run test`
   - [ ] Code compiles: `npm run compile`
   - [ ] No linting errors
   - [ ] Documentation updated
   - [ ] No prohibited terms (dapp+number, , etc.)

2. **Description Template**
   ```markdown
   ## Summary
   Brief description of changes

   ## Changes
   - Change 1
   - Change 2
   - Change 3

   ## Testing
   - [ ] All tests pass
   - [ ] New tests added (X tests)
   - [ ] Gas efficiency verified
   - [ ] No regressions

   ## Documentation
   - [ ] README updated
   - [ ] Inline comments added
   - [ ] Docs generated
   - [ ] API reference updated

   ## Related Issues
   Fixes #123
   Related to #456
   ```

3. **Review Process**
   - Maintainers review changes
   - Feedback and discussions
   - Make requested changes
   - Re-request review after updates

4. **Merge**
   - Approved and ready to merge
   - Branch is up to date
   - All checks pass

## Adding New Examples

See **DEVELOPER_GUIDE.md** section: "Adding New Examples"

### Example Contribution Checklist

- [ ] Contract created in `contracts/<category>/`
- [ ] Tests created with 10+ test cases
- [ ] Tests include ✅ happy path and ❌ error cases
- [ ] Added to EXAMPLES_MAP in create-fhevm-example.ts
- [ ] Added to EXAMPLES_CONFIG in generate-docs.ts
- [ ] Documentation generated: `npm run generate-docs your-example`
- [ ] Test standalone: `npm run create-example your-example ./test`
- [ ] All tests pass: `npm run test`
- [ ] README updated with new example
- [ ] No prohibited terms used

## Code Style Guidelines

### Solidity

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/// @title Clear descriptive title
/// @notice What does this contract do?
contract MyContract {
  // State variables
  uint256 private counter;

  // Events
  event CounterIncremented(uint256 newValue);

  // Modifiers
  modifier onlyAuthorized() {
    require(msg.sender == owner, "Not authorized");
    _;
  }

  // Functions (public → external → internal → private)
  /// @notice What does this function do?
  /// @param input Description of input
  /// @return Output description
  function publicFunction(uint256 input) public returns (uint256) {
    // Implementation
  }
}
```

**Guidelines:**
- Use NatSpec comments (///)
- Clear variable and function names
- Consistent formatting
- Modifiers for access control
- Events for important actions
- Internal functions for helpers

### TypeScript/JavaScript

```typescript
/**
 * Brief description of what this does
 *
 * Detailed explanation if needed
 */
async function myFunction(param: string): Promise<void> {
  // Implementation
}
```

**Guidelines:**
- Use TypeScript for type safety
- JSDoc comments for functions
- Descriptive variable names
- Error handling
- Async/await for promises

### Tests

```typescript
describe("Feature Category", function () {
  // ✅ Test: Success case
  it("Should perform expected behavior", async function () {
    const result = await contract.function();
    expect(result).to.equal(expectedValue);
  });

  // ❌ Test: Error case
  it("Should reject invalid input", async function () {
    await expect(contract.invalidFunction()).to.be.revertedWith("Error");
  });
});
```

**Guidelines:**
- Use ✅ for passing cases, ❌ for failing cases
- Clear test descriptions
- Test one thing per test
- Include both success and error paths
- Meaningful assertions

## Documentation Standards

### Comments

```solidity
/// @title Short description
/// @notice What users need to know
/// @dev Implementation notes
function example() external {
  // Implementation comment
}
```

### README Updates

When adding features:
1. Update feature list
2. Add usage examples
3. Include relevant sections
4. Keep examples current

### API Documentation

Create entries in API_DOCUMENTATION.md:
```markdown
### FunctionName

**Parameters:**
- `param1` (type) - Description

**Returns:**
- (type) - Description

**Example:**
```solidity
contract.functionName(value);
```

**Events:** EventName

**Reverts:** "Error message"
```

## Testing Requirements

### Minimum Test Coverage

- New contract: 10+ tests
- New function: 2+ tests (success + error)
- New feature: Comprehensive tests covering:
  - Happy path
  - Error cases
  - Edge cases
  - State transitions

### Test Quality

✅ **Good Tests:**
```typescript
it("Should mark prediction as correct when revealed value matches outcome", async () => {
  await contract.makePrediction(0, true);
  await ethers.provider.send("hardhat_mine", ...);
  await contract.finalizeEvent(0, true);
  await contract.revealPrediction(0, true);

  const [,,, result] = await contract.getUserPrediction(0, user.address);
  expect(result).to.equal(true);
});
```

❌ **Bad Tests:**
```typescript
it("test 1", async () => {
  await contract.foo();
  // Not descriptive
});
```

## Performance Guidelines

### Gas Optimization

- Minimize storage writes
- Combine operations when possible
- Use efficient data structures
- Test with REPORT_GAS=true

```bash
REPORT_GAS=true npm run test
```

Target gas usage:
- Event creation: <150k
- Prediction: <120k
- Finalization: <150k

### Testing Performance

- Compile time: < 5 seconds
- Test execution: < 15 seconds
- Individual test: < 200ms

## Security Considerations

### Code Review Checklist

- [ ] No unauthorized access
- [ ] Proper input validation
- [ ] Safe state transitions
- [ ] No reentrancy issues
- [ ] Overflow/underflow prevention
- [ ] Proper event emissions

### Common Issues

❌ **Missing Access Control:**
```solidity
function criticalFunction() external {
  // Anyone can call!
}
```

✅ **With Access Control:**
```solidity
modifier onlyOwner() {
  require(msg.sender == owner);
  _;
}

function criticalFunction() external onlyOwner {
  // Only owner can call
}
```

## Naming Conventions

### Variables & Functions

```
myVariable       // camelCase for variables
MyContract       // PascalCase for contracts
MY_CONSTANT      // UPPER_CASE for constants
_privateVar      // underscore prefix for private
__internalVar    // double underscore for internal
```

### Branches

```
feature/add-multi-round
fix/duplicate-prediction-bug
docs/update-api-reference
test/add-integration-tests
refactor/optimize-gas
```

## Release Process

### Version Numbering

Use semantic versioning: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

Example: 1.2.3

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] CHANGELOG.md updated
- [ ] README examples work
- [ ] GitHub release created

## Support

### Getting Help

- **Documentation:** See DEVELOPER_GUIDE.md
- **Issues:** Check GitHub issues
- **Discussions:** Use GitHub discussions
- **Community:** Join Zama Discord

### Contact

- **Email:** developer@zama.ai
- **Discord:** https://discord.com/invite/zama
- **Forum:** https://www.zama.ai/community
- **X/Twitter:** https://twitter.com/zama

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Recognized in release notes
- Credited in documentation

## License

By contributing, you agree that your contributions will be licensed under the BSD-3-Clause-Clear License.

## Additional Resources

- **DEVELOPER_GUIDE.md** - Development workflow
- **scripts/README.md** - Automation tools
- **TEST_COVERAGE_SUMMARY.md** - Testing details
- **API_DOCUMENTATION.md** - Contract API
- **README.md** - Project overview

---

Thank you for contributing to the Privacy Prediction Platform! 🚀

Together we're advancing privacy-preserving blockchain technology.

# BrowseChat Test Suite

## Overview
This directory contains the test suite for the BrowseChat VSCode extension. The tests are built using Jest and the VSCode Extension Testing API.

## Directory Structure
```
tests/
├── .test-workspace/     # Isolated test workspace
├── helpers/            # Test helper utilities
├── mocks/              # Mock implementations
├── unit/              # Unit test files
├── extension.test.ts  # Main extension tests
└── setup.ts           # Test environment setup
```

## Test Categories

### Unit Tests (`unit/`)
- **Commands**: Test command handlers and execution flow
- **Parser**: Validate chat log parsing and metadata extraction
- **Settings**: Test configuration management
- **UI**: Test UI component behavior

### Integration Tests (`extension.test.ts`)
- Extension activation
- Command registration
- Workspace state management
- Security implementations

## Test Environment

### Setup
```typescript
import { setupTestEnvironment } from "./setup";

beforeAll(async () => {
  testEnv = await setupTestEnvironment();
});
```

### Teardown
```typescript
import { teardownTestEnvironment } from "./setup";

afterAll(async () => {
  await teardownTestEnvironment(testEnv.workspace);
});
```

## Mock System

### VSCode API
- Located in `mocks/vscode.ts`
- Simulates VSCode extension context
- Provides mock command registry
- Implements workspace and global state

### File System
- Located in `mocks/fs.ts`
- Simulates file operations
- Handles test fixtures
- Manages test workspace

## Running Tests

### Prerequisites
- Node.js v16 or higher
- VSCode Extension Development Tools

### Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/commands/ExportChatCommand.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Jest Unit Tests

## Overview
This directory contains unit tests for the BrowseChat VSCode extension using Jest and TypeScript.

## Directory Structure
```
tests/
├── __mocks__/        # Mock implementations
├── __fixtures__/     # Test fixtures and sample data
├── unit/            # Unit test files
│   ├── parser/      # Chat parser tests
│   ├── models/      # Data model tests
│   ├── commands/    # Command tests
│   └── utils/       # Utility function tests
├── setup.ts         # Jest setup file
├── jest.config.js   # Jest configuration
└── README.md        # This file
```

## Running Tests

### VS Code Tasks
Two predefined tasks are available in VS Code:

1. **Run Unit Tests**
   ```bash
   > Tasks: Run Task > test:unit
   ```
   - Executes all unit tests
   - Shows detailed test results
   - Generates coverage report

2. **Run Unit Tests (Watch)**
   ```bash
   > Tasks: Run Task > test:unit:watch
   ```
   - Watches for file changes
   - Automatically reruns affected tests
   - Interactive mode for test filtering

### Command Line
Run tests using npm:
```bash
# Run all tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode
npm run test:unit:watch
```

## Writing Tests

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Best Practices
1. Follow AAA pattern (Arrange, Act, Assert)
2. One assertion per test
3. Use descriptive test names
4. Mock external dependencies
5. Keep tests focused and atomic

### Using Mocks
```typescript
// Mock VSCode API
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn()
  }
}));

// Mock file system
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));
```

### Test Fixtures
- Place test data in `__fixtures__/`
- Use meaningful file names
- Keep fixtures minimal
- Example:
  ```typescript
  import { sampleChat } from '../__fixtures__/sampleChat';
  ```

## Coverage
- Coverage reports in `coverage/`
- Minimum thresholds:
  - Statements: 85%
  - Branches: 85%
  - Functions: 90%
  - Lines: 85%

## Debugging
1. Use VS Code's Jest debugger
2. Set breakpoints in test files
3. Use `debugger` statement
4. Check Jest output for failures
5. Use `--verbose` for detailed logs

## Tips
1. Use `beforeEach`/`afterEach` for setup/cleanup
2. Group related tests with `describe`
3. Skip tests with `test.skip` or `describe.skip`
4. Focus tests with `test.only` or `describe.only`
5. Use snapshot testing sparingly

## Common Patterns

### Testing Async Code
```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Exceptions
```typescript
it('should handle errors', () => {
  expect(() => {
    riskyFunction();
  }).toThrow('Expected error message');
});
```

### Snapshot Testing
```typescript
it('should match snapshot', () => {
  const component = renderComponent();
  expect(component).toMatchSnapshot();
});
```

## Writing Tests

### Test File Template
```typescript
import * as vscode from "vscode";
import { setupTestEnvironment } from "../setup";

describe("Feature", () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  test("should behave correctly", () => {
    // Test implementation
  });
});
```

### Best Practices
1. Use the provided test environment setup
2. Clean up resources after tests
3. Mock external dependencies
4. Use type-safe assertions
5. Follow the naming convention: `*.test.ts`

## Debugging Tests

### VSCode Launch Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/jest/bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Tips
- Use `debugger` statement in tests
- Enable source maps
- Use VSCode breakpoints
- Check Jest output for failures

## Contributing
1. Follow the existing test structure
2. Update test documentation
3. Maintain coverage requirements
4. Add to CHANGELOG.md

## See Also
- [CHANGELOG.md](./CHANGELOG.md) - Test suite changes
- [Jest Documentation](https://jestjs.io/)
- [VSCode Testing API](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

# BDD Testing Suite for BrowseChat VSCode Extension

This directory contains the Behavior-Driven Development (BDD) test suite for the BrowseChat VSCode extension, implemented using Cucumber.js with TypeScript.

## Directory Structure

```
behaviour/
├── features/              # Gherkin feature files
│   ├── chat_parser/      # Chat parsing features
│   ├── ui_components/    # UI component features
│   ├── commands/         # Extension command features
│   ├── integration/      # Integration test files
│   │   ├── features/    # .feature files containing Gherkin scenarios
│   │   ├── steps/       # Step definitions implementing the scenarios
│   │   └── support/     # Support files and hooks
│   └── settings/         # Settings and configuration features
├── step_definitions/     # Step implementation files
│   ├── common.steps.ts   # Common step definitions
│   ├── parser.steps.ts   # Parser-specific steps
│   └── webview.steps.ts  # Webview-specific steps
└── support/              # Support files and utilities
    ├── world.ts          # Custom world implementation
    └── hooks.ts          # Test lifecycle hooks
```

## Running Tests

```bash
# Run all BDD tests
npm run test:bdd

# Run specific test suites
npm run test:bdd:smoke        # Smoke tests
npm run test:bdd:integration  # Integration tests
npm run test:bdd:performance  # Performance tests
npm run test:bdd:regression   # Regression tests

# Run tests with reporting
npm run test:bdd:report       # Generates HTML and JSON reports

# Run tests in parallel
npm run test:bdd:parallel     # Runs tests in parallel mode

# Debug tests
npm run test:bdd:debug        # Runs tests in debug mode
```

## Feature Tags

- `@smoke`: Basic functionality tests
- `@integration`: Integration tests
- `@performance`: Performance-related tests
- `@regression`: Regression test suite
- `@ui`: UI component tests
- `@parser`: Chat parser tests
- `@settings`: Configuration tests

## Test Organization

1. **Chat Parser Features**
   - Basic log file parsing
   - Metadata extraction
   - Error handling
   - Large file handling

2. **UI Components**
   - WebView panel implementation
   - Tree view navigation
   - Chat navigation
   - Syntax highlighting
   - Search functionality

3. **Extension Commands**
   - Open chat browser
   - Jump to chat
   - Export chat
   - Search in chats
   - Filter chats

4. **Settings and Configuration**
   - Chat log location
   - Chat log format
   - Workspace detection
   - General configuration

## Writing Tests

### Step Definitions

Step definitions are written in TypeScript and located in the `step_definitions` directory. They use the following pattern:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';

Given('some precondition', async function() {
    // Implementation
});
```

### Custom World

The custom world (`support/world.ts`) provides:
- Extension context management
- Document handling
- Chat segment parsing
- WebView interactions

### Hooks

Test lifecycle hooks (`support/hooks.ts`) handle:
- Extension activation/deactivation
- Test environment setup
- Resource cleanup
- Error handling

## Integration Tests

### Overview
This directory contains the integration tests for the BrowseChat VSCode extension using Cucumber.js for Behavior Driven Development (BDD).

### Directory Structure
```
behaviour/
├── integration/      # Integration test files
│   ├── features/    # .feature files containing Gherkin scenarios
│   ├── steps/       # Step definitions implementing the scenarios
│   └── support/     # Support files and hooks
└── README.md        # This file
```

### Running Tests

#### VS Code Tasks
Three predefined tasks are available in VS Code:

1. **Run Integration Tests**
   ```bash
   > Tasks: Run Task > Run Integration Tests
   ```
   - Executes all integration tests
   - Generates HTML and JSON reports in `reports/`
   - Shows progress bar during execution

2. **Run Integration Tests (Debug)**
   ```bash
   > Tasks: Run Task > Run Integration Tests (Debug)
   ```
   - Runs tests with Node debugger attached
   - Breaks on first line for debugging setup
   - Allows stepping through test execution

3. **Run Integration Tests (Watch)**
   ```bash
   > Tasks: Run Task > Run Integration Tests (Watch)
   ```
   - Watches for file changes
   - Automatically reruns affected tests
   - Provides real-time feedback

#### Command Line
Run tests directly using npm:
```bash
npm run test:integration
```

### Writing Tests

#### Feature Files
- Write features in Gherkin syntax
- Place in `integration/features/`
- Use descriptive scenario names
- Example:
  ```gherkin
  Feature: Chat Browser
    Scenario: Opening chat file
      Given I have a chat log file
      When I open the chat browser
      Then I should see the chat messages
  ```

#### Step Definitions
- Implement steps in TypeScript
- Place in `integration/steps/`
- Use clear, reusable steps
- Example:
  ```typescript
  Given('I have a chat log file', async function() {
    // Implementation
  });
  ```

#### Support Files
- Place hooks in `integration/support/hooks.ts`
- Define world in `integration/support/world.ts`
- Add custom types in `integration/support/types.ts`

### Best Practices
1. Keep scenarios focused and atomic
2. Use tags for organization (@smoke, @regression)
3. Maintain clean, reusable step definitions
4. Add meaningful assertions
5. Clean up test data in hooks

### Debugging
1. Use VS Code's debug configuration
2. Set breakpoints in step definitions
3. Use `this.debug()` in step definitions
4. Check HTML reports for failures
5. Use `--format progress-bar` for clear output

### Reports
Reports are generated in `reports/`:
- `cucumber-report.html`: Interactive HTML report
- `cucumber-report.json`: Raw JSON data

## Reports

Test reports are generated in:
- HTML format: `reports/cucumber-report.html`
- JSON format: `reports/cucumber-report.json`

## Best Practices

1. **Feature Files**
   - Write scenarios in business language
   - Use declarative style
   - Keep scenarios independent
   - Follow Given-When-Then pattern

2. **Step Definitions**
   - Keep steps reusable
   - Use type-safe parameters
   - Handle async operations properly
   - Include meaningful assertions

3. **Test Data**
   - Use realistic test data
   - Clean up test data in hooks
   - Avoid dependencies between scenarios

## Contributing

1. Add new features in the appropriate subdirectory
2. Implement corresponding step definitions
3. Update this README if adding new patterns or conventions
4. Run the full test suite before submitting changes

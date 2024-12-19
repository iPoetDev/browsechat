# Changelog

All notable changes to the BDD test suite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial BDD test suite setup with Cucumber.js and TypeScript
- Core test infrastructure:
  - Custom World implementation for VSCode extension testing
  - Test lifecycle hooks for setup and teardown
  - Common step definitions for basic operations
- Feature files for core functionality:
  - Chat parser features
  - UI component features
  - Extension command features
  - Settings integration features
- Step definitions:
  - `common.steps.ts` for VSCode and extension activation
  - `parser.steps.ts` for chat log parsing
  - `webview.steps.ts` for webview interactions
- Support files:
  - `world.ts` with helper methods and shared state
  - `hooks.ts` for test lifecycle management
- Test running scripts in package.json:
  - Basic test execution
  - Tagged test runs (smoke, integration, etc.)
  - Parallel test execution
  - Report generation
- Documentation:
  - README with comprehensive test suite documentation
  - Initial CHANGELOG

### Changed
- Restructured test organization to follow BDD best practices
- Updated package.json with Cucumber.js and testing dependencies

### Technical Details
- Added dependencies:
  - @cucumber/cucumber ^10.0.1
  - @cucumber/pretty-formatter ^1.0.0
  - chai ^4.3.10
  - chai-as-promised ^7.1.1
  - Multiple reporting tools and TypeScript support packages
- Configured Cucumber.js for TypeScript support
- Set up parallel test execution capability
- Implemented async/await pattern in step definitions

## [0.0.1] - 2024-12-14

### Initial Setup
- Created basic directory structure for BDD tests
- Added initial feature files for core functionality
- Set up TypeScript configuration for test suite

# Configuration Changelog
All notable configuration changes to the BrowseChat extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.0.1] - 2024-12-14
### Added
#### VSCode Configuration
- `.vscode-test.mjs` for multi-editor E2E testing support
  - VSCode Stable (^1.94.0)
  - VSCode Insiders
  - VSCodium (^1.94.0)
  - Windsurf support
- Platform-specific test configurations (Windows x64)

#### Package Configuration
- Initial `package.json` setup
  - Engine requirements: VSCode ^1.94.0, VSCodium ^1.94.0
  - Description updated for Windsurf-only support
  - Test scripts for different editors
  - Development dependencies:
    - @vscode/test-cli
    - cross-env
    - Jest 29.7.0
    - ts-jest 29.1.1

#### Testing Configuration
- `jest.config.js` with TypeScript support
  - Module resolution for VSCode
  - Test environment configuration
  - Coverage thresholds:
    - Statements: 85%
    - Branches: 85%
    - Functions: 90%
    - Lines: 85%

#### TypeScript Configuration
- `tsconfig.json` setup
  - ES2022 target
  - CommonJS module system
  - Strict type checking
  - Source map support

#### Build Configuration
- `webpack.config.js` for extension bundling
  - Production and development modes
  - External VSCode modules
  - Source map support

#### Linting Configuration
- `eslint.config.mjs` with:
  - TypeScript support
  - VSCode extension rules
  - Jest testing environment

#### Workspace Configuration
- `browsechat.code-workspace` settings
  - Editor configurations
  - Extension development host settings
  - Debug configurations

#### Git Configuration
- `.gitignore` setup
  - Build output exclusions
  - Node modules
  - Test results
  - Coverage reports
  - User-specific files

- `.vscodeignore` for extension packaging
  - Development files exclusion
  - Test files exclusion
  - Source maps
  - Documentation

### Changed
- Updated extension description in `package.json`
- Enhanced test configurations for multiple editors
- Refined workspace settings for development

### Security
- Isolated test environments in `.vscode-test.mjs`
- Platform-specific user data handling
- Secure extension packaging rules

[0.0.1]: https://github.com/yourusername/browsechat/releases/tag/v0.0.1

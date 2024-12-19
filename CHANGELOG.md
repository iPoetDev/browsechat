# Change Log

All notable changes to the "browsechat" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.1] - 2024-12-14
### Added
- Initial release of BrowseChat extension
- Support for browsing IDE-LLM Chat agent logs (Windsurf only)
- Multi-editor support:
  - VSCode (^1.94.0)
  - VSCodium (^1.94.0)
  - Windsurf
- E2E testing framework with platform-specific configurations
- Unit testing setup with Jest and TypeScript

### Changed
- Updated extension description to clarify Windsurf-only support
- Enhanced test infrastructure with @vscode/test-cli
- Improved development environment setup

### Security
- Implemented isolated test environments
- Added platform-specific user data handling

[0.0.1]: https://github.com/yourusername/browsechat/releases/tag/v0.0.1

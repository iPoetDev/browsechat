Feature: Settings Integration with VSCode State Management
    As a chat browser extension
    I want to ensure proper integration between Settings and VSCode state systems
    So that user preferences and configurations are properly managed and persisted

    Background:
        Given the VSCode extension context is initialized
        And the settings manager is configured
        And the workspace is ready
        And the filesystem access is available

    Scenario: Global Settings Integration
        Given global extension settings exist
        When settings are loaded from VSCode
        Then global configurations should be retrieved
        And default values should be applied where missing
        And settings should be type-validated
        And changes should be persisted to global state

    Scenario: Workspace Settings Integration
        Given a workspace is active
        When workspace-specific settings are configured
        Then workspace settings should override globals
        And workspace state should be preserved
        And changes should affect only current workspace
        And settings should sync across workspace files

    Scenario: Log Format Settings Integration
        Given log format configurations exist
        When log format settings are loaded
        Then parser should use correct format
        And format validation should occur
        And invalid formats should be rejected
        And format changes should update parser behavior

    Scenario: Log Location Settings Integration
        Given log file locations are configured
        When location settings are loaded
        Then filesystem paths should be validated
        And relative paths should be resolved
        And invalid paths should be reported
        And location changes should trigger reload

    Scenario: Workspace Detection Settings
        Given multiple workspace folders exist
        When workspace detection runs
        Then correct workspace should be identified
        And workspace settings should be loaded
        And workspace state should be initialized
        And detection results should be cached

    Scenario: General Configuration Integration
        Given general configurations are defined
        When configuration changes occur
        Then all components should be notified
        And dependent systems should update
        And configuration state should be consistent
        And changes should be properly logged

    Scenario: Settings Migration
        Given old settings format exists
        When settings migration is triggered
        Then settings should be converted correctly
        And old settings should be preserved
        And new format should be validated
        And migration should be logged

    Scenario: Settings Persistence
        Given settings changes are made
        When VSCode is restarted
        Then all settings should be restored
        And custom states should persist
        And file locations should remain valid
        And configurations should be consistent

    Scenario: Settings Error Handling
        Given invalid settings are introduced
        When settings validation occurs
        Then appropriate errors should be shown
        And default values should be used
        And error state should be logged
        And recovery should be possible

    Scenario: Multi-Root Workspace Settings
        Given multiple workspace roots exist
        When settings are accessed
        Then correct scope should be determined
        And root-specific settings should apply
        And global settings should be preserved
        And scope conflicts should be resolved

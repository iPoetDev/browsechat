Feature: Parser and Models Integration
    As a chat browser extension
    I want to ensure proper integration between Parser and Models components
    So that chat logs are correctly parsed and stored in the data model

    Background:
        Given the chat parser is initialized
        And the data model manager is ready

    Scenario: Parse single chat log file into chat segments
        Given a valid chat log file with multiple conversations
        When the parser processes the file
        Then chat segments should be created
        And each segment should have correct metadata
        And segments should be stored in the data model

    Scenario: Handle metadata extraction during parsing
        Given a chat log file with conversation metadata
        When the metadata extractor processes the file
        Then chat metadata should be extracted
        And metadata should be associated with correct chat segments
        And the data model should be updated with metadata

    Scenario: Process multiple chat files sequentially
        Given multiple chat log files in the workspace
        When the parser processes each file
        Then each file should create separate chat sequences
        And all sequences should be stored in the data model
        And the model should maintain correct file references

    Scenario: Handle invalid chat log format
        Given a malformed chat log file
        When the parser attempts to process the file
        Then appropriate error should be captured
        And the data model should not be corrupted
        And error status should be properly reported

    Scenario: Update existing chat segments
        Given a previously parsed chat log file
        When the file content is modified
        And the parser reprocesses the file
        Then existing chat segments should be updated
        And the data model should reflect the changes

    Scenario: Handle large chat log files
        Given a chat log file larger than 50MB
        When the parser processes the large file
        Then memory usage should stay within limits
        And all chat segments should be correctly parsed
        And the data model should handle the large dataset efficiently

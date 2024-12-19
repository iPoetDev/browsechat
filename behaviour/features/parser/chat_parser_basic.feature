Feature: Basic Log File Parsing
  As a developer using VS Code
  I want to open and parse my chat log files
  So that I can view my chat conversations in a structured format

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @smoke @parser
  Scenario: Successfully parse a valid log file
    Given I have a log file "sample.log" with size less than 10MB
    When I open the log file in VS Code
    Then the parser should successfully read the file
    And identify chat segments starting with "Me"
    And return properly structured ChatSegment objects

  @parser @validation
  Scenario: Reject oversized log file
    Given I have a log file "large.log" with size greater than 10MB
    When I try to open the log file in VS Code
    Then the parser should reject the file
    And display an error message about file size limit

  @parser @performance
  Scenario: Process file in chunks
    Given I have a log file "medium.log" of 5MB
    When I open the log file in VS Code
    Then the parser should process the file in 1MB chunks
    And maintain correct conversation boundaries between chunks
    And stay within memory limits

  @parser @timeout
  Scenario: Handle parsing timeout
    Given I have a complex log file "complex.log"
    When the parsing time exceeds 5000ms
    Then the parser should stop processing
    And show a timeout error message
    And clean up any partial parsing results

  @parser @error
  Scenario Outline: Handle invalid file scenarios
    Given I have a log file "<filename>" with <condition>
    When I try to open the log file in VS Code
    Then the parser should show error "<error_message>"

    Examples:
      | filename      | condition           | error_message                    |
      | empty.log     | no content         | File is empty                    |
      | binary.log    | binary content     | Invalid file format              |
      | corrupt.log   | corrupted content  | Unable to parse file content     |
      | invalid.txt   | wrong extension    | Unsupported file type            |

  @parser @segments
  Scenario: Maintain conversation context
    Given I have a log file "chat.log" with multiple conversations
    When I open the log file in VS Code
    Then each chat segment should have:
      | Property    | Requirement                    |
      | id         | unique identifier              |
      | startIndex | valid number > 0              |
      | endIndex   | greater than startIndex       |
      | content    | non-empty string              |
    And conversations should not overlap
    And all "Me" keyword occurrences should start new segments

Feature: Chat Metadata Extraction
  As a developer using VS Code
  I want the parser to extract metadata from my chat segments
  So that I can better organize and search through my conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And I have opened a valid chat log file

  @metadata @smoke
  Scenario: Extract complete metadata from chat segment
    Given a chat segment contains all metadata fields
    When the parser processes the segment
    Then it should extract the following metadata:
      | Field        | Type          | Requirement    |
      | participants | array         | non-empty      |
      | length      | number        | greater than 0 |
      | keywords    | array         | optional       |
    And associate the metadata with the correct ChatSegment

  @metadata @validation
  Scenario: Handle missing optional metadata
    Given a chat segment with only required metadata fields
    When the parser processes the segment
    Then it should extract required fields:
      | Field        | Type          |
      | participants | array         |
      | length      | number        |
    And set optional fields to undefined
    And not throw any errors

  @metadata @performance
  Scenario: Maintain parsing speed with metadata extraction
    Given a log file with 100 chat segments
    When the parser processes the entire file
    Then the parsing speed should not drop below 1MB/s
    And memory usage should stay within specified limits
    And all metadata should be correctly extracted

  @metadata @participants
  Scenario: Correctly identify chat participants
    Given a chat segment with multiple participants
    When the parser extracts metadata
    Then the participants array should:
      | Requirement                             |
      | Include all unique participants         |
      | Remove duplicate participant entries    |
      | Maintain participant name formatting    |
      | Handle special characters in names      |

  @metadata @validation
  Scenario Outline: Validate metadata format
    Given a chat segment with <field> containing <value>
    When the parser extracts metadata
    Then it should <action>

    Examples:
      | field        | value           | action                           |
      | participants | empty array     | throw validation error           |
      | length      | negative number | throw validation error           |
      | length      | zero           | throw validation error           |
      | keywords    | empty array     | set field as undefined           |
      | keywords    | null           | set field as undefined           |

  @metadata @typescript
  Scenario: Ensure type safety
    Given the parser has extracted metadata
    When the metadata is passed to the ChatSegment
    Then all fields should match TypeScript interfaces
    And type validation should not throw any errors
    And optional fields should be properly typed

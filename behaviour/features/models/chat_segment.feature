Feature: Chat Segment Implementation
  As a VS Code extension developer
  I want a robust ChatSegment data structure
  So that I can reliably store and manage chat segments

  Background:
    Given the data model system is initialized
    And a valid chat sequence exists

  @segment @smoke
  Scenario: Create new chat segment
    Given a portion of log file containing a "Me" keyword
    When a new ChatSegment is created
    Then it should have the following properties:
      | Property    | Type     | Requirement                     |
      | id         | string   | unique identifier               |
      | sequenceId | string   | matches parent sequence         |
      | startIndex | number   | position of "Me" keyword        |
      | endIndex   | number   | before next "Me" or EOF         |
      | content    | string   | non-empty                       |
      | metadata   | object   | valid ChatMetadata              |
      | order      | number   | position in sequence            |

  @segment @boundaries
  Scenario: Detect segment boundaries
    Given a log file with multiple "Me" keywords
    When segments are created
    Then each segment should:
      | Boundary Check                                |
      | Start exactly at a "Me" keyword              |
      | End before the next "Me" keyword             |
      | Have no overlap with adjacent segments       |
      | Contain all text between boundaries          |

  @segment @content
  Scenario: Extract and sanitize content
    Given a raw chat segment from the log file
    When the content is extracted
    Then it should:
      | Content Check                                 |
      | Remove leading/trailing whitespace            |
      | Preserve internal formatting                  |
      | Handle special characters correctly           |
      | Maintain newlines and paragraph structure     |

  @segment @order
  Scenario: Track segment order
    Given multiple segments in a sequence
    When the order is assigned
    Then segments should:
      | Order Check                                   |
      | Have sequential order numbers                 |
      | Reflect original file position               |
      | Handle gaps in numbering                     |
      | Update order on sequence changes             |

  @segment @validation
  Scenario Outline: Validate segment properties
    Given a segment with <property> set to <value>
    When validation is performed
    Then it should <result>

    Examples:
      | property    | value          | result                    |
      | id         | empty string   | throw validation error    |
      | sequenceId | invalid id     | throw validation error    |
      | startIndex | negative       | throw validation error    |
      | endIndex   | < startIndex   | throw validation error    |
      | content    | empty          | throw validation error    |
      | order      | duplicate      | throw validation error    |

  @segment @memory
  Scenario: Optimize memory usage
    Given a large chat segment with content > 1MB
    When the segment is processed
    Then memory usage should be optimized by:
      | Optimization                                  |
      | Using efficient string storage                |
      | Implementing lazy loading where possible      |
      | Cleaning up unused resources                  |
      | Maintaining performance requirements          |

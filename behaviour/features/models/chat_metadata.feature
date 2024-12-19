Feature: Chat Metadata Structure
  As a VS Code extension developer
  I want comprehensive metadata structures
  So that I can store and manage conversation information at multiple levels

  Background:
    Given the data model system is initialized
    And valid chat sequences and segments exist

  @metadata @sequence
  Scenario: Create sequence metadata
    Given a chat sequence from a log file
    When sequence metadata is created
    Then it should contain source information:
      | Property      | Type     | Requirement           |
      | filename     | string   | valid file name      |
      | size         | number   | file size in bytes   |
      | lastModified | string   | ISO date string      |
    And include sequence metrics:
      | Property      | Type     | Requirement           |
      | segmentCount | number   | > 0                  |
      | totalLength  | number   | sum of segments      |

  @metadata @segment
  Scenario: Create segment metadata
    Given a chat segment with a "Me" keyword
    When segment metadata is created
    Then it should contain:
      | Property   | Type     | Requirement                  |
      | speaker    | string   | from "Me" line              |
      | length     | number   | > 0                         |
      | position   | number   | file position               |
      | keywords   | array    | optional, can be empty      |

  @metadata @extraction
  Scenario: Extract metadata from content
    Given a chat segment with content
    When metadata extraction runs
    Then it should:
      | Action                                      |
      | Extract speaker from "Me" line              |
      | Calculate correct content length            |
      | Record accurate file position               |
      | Identify relevant keywords if present       |

  @metadata @validation
  Scenario Outline: Validate metadata fields
    Given <metadata_type> metadata with <field> set to <value>
    When validation is performed
    Then it should <result>

    Examples:
      | metadata_type | field        | value         | result                 |
      | sequence     | filename     | empty         | throw error           |
      | sequence     | size         | negative      | throw error           |
      | sequence     | segmentCount | zero          | throw error           |
      | segment      | speaker      | empty         | throw error           |
      | segment      | length       | negative      | throw error           |
      | segment      | position     | invalid       | throw error           |

  @metadata @search
  Scenario: Index metadata for search
    Given multiple chat segments with metadata
    When search indexing is performed
    Then it should:
      | Index Requirement                           |
      | Create searchable speaker index             |
      | Index all non-empty keywords                |
      | Maintain position information               |
      | Enable efficient metadata queries           |

  @metadata @updates
  Scenario: Handle metadata updates
    Given existing metadata for a chat segment
    When the segment content changes
    Then metadata should:
      | Update Requirement                          |
      | Recalculate affected values                |
      | Maintain consistency with content           |
      | Preserve unaffected fields                 |
      | Trigger appropriate update events           |

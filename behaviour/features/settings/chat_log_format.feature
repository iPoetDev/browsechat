Feature: Chat Log Format Configuration
  As a VS Code user
  I want to configure chat log file formats
  So that the extension can properly identify and parse my log files

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @settings @filetypes
  Scenario: Configure supported file types
    When I update browsechat.logs.format.fileTypes setting
    Then I should be able to:
      | File Type Configuration                   |
      | Add multiple file extensions              |
      | Remove existing extensions                |
      | Use case-sensitive extensions             |
      | Set default extension                     |
      | Validate extension format                 |

  @settings @encoding
  Scenario Outline: Handle different file encodings
    Given I set the file encoding to <encoding>
    When reading a log file
    Then it should <result>

    Examples:
      | encoding    | result                           |
      | utf8        | read content correctly           |
      | utf16le     | handle Unicode properly          |
      | ascii       | handle ASCII content             |
      | invalid     | show encoding error              |
      | unsupported | suggest alternative              |

  @settings @validation
  Scenario: Validate file formats
    Given a log file with specific format
    When the format is validated
    Then it should check:
      | Format Validation                         |
      | File extension match                      |
      | Content structure                         |
      | Encoding compatibility                    |
      | Required markers presence                 |
      | File integrity                           |

  @settings @detection
  Scenario: Detect file formats
    Given a new log file
    When format detection runs
    Then it should:
      | Detection Check                           |
      | Identify file type                        |
      | Determine encoding                        |
      | Verify format compatibility               |
      | Suggest optimal settings                  |
      | Report detection confidence               |

  @settings @custom
  Scenario: Define custom formats
    When I create a custom format definition
    Then I should be able to specify:
      | Format Property                           |
      | File extensions                           |
      | Content structure                         |
      | Required markers                          |
      | Encoding requirements                     |
      | Parsing rules                            |

  @settings @compatibility
  Scenario: Maintain format compatibility
    Given existing log files
    When format settings change
    Then the system should:
      | Compatibility Check                       |
      | Maintain existing file access             |
      | Update parser configuration               |
      | Preserve file associations                |
      | Handle format transitions                 |
      | Notify about incompatibilities            |

  @settings @feedback
  Scenario: Provide format validation feedback
    When validating file formats
    Then feedback should include:
      | Feedback Information                      |
      | Validation status                         |
      | Specific issues found                     |
      | Suggested corrections                     |
      | Format requirements                       |
      | Compatibility notes                       |

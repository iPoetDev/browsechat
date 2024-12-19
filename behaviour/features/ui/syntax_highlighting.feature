Feature: Syntax Highlighting
  As a VS Code user
  I want syntax highlighting for chat segments
  So that I can easily distinguish different parts of the conversation

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And a chat log is open

  @highlighting @theme
  Scenario: Apply theme-aware highlighting
    Given VS Code is using theme "<theme>"
    When chat content is rendered
    Then highlighting should:
      | Theme Check                               |
      | Match VS Code theme colors                |
      | Maintain contrast ratios                  |
      | Update with theme changes                 |
      | Apply consistent token styles             |

    Examples:
      | theme          |
      | Light          |
      | Dark           |
      | High Contrast  |

  @highlighting @code
  Scenario: Highlight code blocks
    Given a chat segment containing code blocks
    When the content is rendered
    Then code blocks should:
      | Code Highlighting                         |
      | Use appropriate language grammar          |
      | Show language-specific syntax             |
      | Maintain proper indentation               |
      | Include line numbers                      |
      | Support copying with formatting           |

  @highlighting @participants
  Scenario: Highlight chat participants
    Given a chat segment with multiple participants
    When the content is displayed
    Then participant highlighting should:
      | Participant Check                         |
      | Use distinct colors for each participant  |
      | Maintain consistency across segments      |
      | Handle special characters in names        |
      | Support participant filtering             |

  @highlighting @timestamps
  Scenario: Format timestamps
    Given chat segments with timestamp information
    When the content is rendered
    Then timestamps should be:
      | Timestamp Format                          |
      | Consistently formatted                    |
      | Easily distinguishable                    |
      | Localized appropriately                   |
      | Optionally convertible to local time      |

  @highlighting @keywords
  Scenario: Emphasize keywords
    Given chat content with important keywords
    When the content is displayed
    Then keywords should be:
      | Keyword Highlight                         |
      | Visually emphasized                       |
      | Consistently styled                       |
      | Searchable                               |
      | Configurable                             |

  @highlighting @tokens
  Scenario: Apply custom token types
    Given different types of chat content
    Then custom tokens should be applied for:
      | Content Type    | Token Style              |
      | Commands       | Bold, distinct color      |
      | Links          | Underlined, clickable     |
      | Mentions       | Highlighted background    |
      | Emojis         | Preserved formatting      |
      | Metadata       | Subtle, secondary style   |

  @highlighting @performance
  Scenario: Maintain highlighting performance
    Given a large chat segment
    When syntax highlighting is applied
    Then the system should:
      | Performance Check                         |
      | Complete within rendering budget          |
      | Update efficiently on changes             |
      | Handle concurrent highlights              |
      | Maintain UI responsiveness                |

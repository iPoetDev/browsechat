Feature: Jump to Chat Command
  As a VS Code user
  I want to quickly jump to specific chat segments
  So that I can efficiently navigate through conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat logs are loaded

  @command @quickpick
  Scenario: Show quick pick interface
    When I execute "Browse Chat: Jump to Chat"
    Then I should see a quick pick with:
      | Quick Pick Element                         |
      | List of available segments                 |
      | Segment previews                           |
      | "Me" keyword context                       |
      | Segment timestamps                         |
      | Search/filter box                          |

  @command @preview
  Scenario: Display segment preview
    Given the quick pick is open
    When I navigate through segments
    Then each preview should show:
      | Preview Content                           |
      | First line of segment                     |
      | Participant information                   |
      | Timestamp if available                    |
      | Relevant metadata                         |

  @command @navigation
  Scenario: Navigate to selected segment
    Given I select a segment from quick pick
    When I confirm the selection
    Then the system should:
      | Navigation Action                         |
      | Jump within 100ms                         |
      | Highlight selected segment                |
      | Scroll to correct position                |
      | Update navigation history                 |

  @command @keyboard
  Scenario: Use keyboard shortcuts
    Given the chat browser is open
    Then the following shortcuts should work:
      | Shortcut      | Action                    |
      | Ctrl+J        | Open jump dialog          |
      | Arrow keys    | Navigate segments         |
      | Enter         | Select segment            |
      | Esc          | Close dialog              |
      | Alt+P/N      | Previous/Next segment     |

  @command @history
  Scenario: Maintain navigation history
    Given I have jumped to multiple segments
    When I check the navigation history
    Then it should:
      | History Feature                           |
      | Show recently visited segments            |
      | Allow backward navigation                 |
      | Allow forward navigation                  |
      | Persist across sessions                   |

  @command @performance
  Scenario: Ensure navigation performance
    Given a log file with many segments
    When performing jump operations
    Then the system should:
      | Performance Check                         |
      | Complete jumps within 100ms               |
      | Maintain UI responsiveness                |
      | Handle large segment lists                |
      | Update UI smoothly                        |

  @command @multifile
  Scenario: Navigate across multiple files
    Given multiple log files are open
    When using jump to chat
    Then I should be able to:
      | Multi-file Navigation                     |
      | See segments from all files               |
      | Jump between files seamlessly             |
      | Maintain file context                     |
      | Track cross-file navigation               |

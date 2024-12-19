Feature: Chat Navigation Features
  As a VS Code user
  I want quick navigation capabilities between chat segments
  So that I can efficiently move through conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat logs are loaded

  @navigation @jump
  Scenario: Jump to specific chat segment
    Given multiple chat segments exist
    When I execute the "Jump to Chat" command
    Then I should:
      | Navigation Check                          |
      | See a quick pick list of segments         |
      | Get instant response on selection         |
      | Have segment preview                      |
      | See relevant segment metadata             |

  @navigation @breadcrumb
  Scenario: Use breadcrumb navigation
    Given I am viewing a chat segment
    Then the breadcrumb should show:
      | Level      | Information              |
      | File       | Log file name            |
      | Sequence   | Sequence identifier      |
      | Segment    | Current segment          |
    And clicking any breadcrumb level should navigate accordingly

  @navigation @keyboard
  Scenario: Use keyboard shortcuts
    Given I am in the chat view
    Then the following shortcuts should work:
      | Shortcut          | Action                    |
      | Ctrl+Alt+N        | Next segment              |
      | Ctrl+Alt+P        | Previous segment          |
      | Ctrl+Alt+J        | Jump to segment           |
      | Ctrl+Alt+H        | Show history              |
      | Ctrl+Alt+B        | Back in history           |

  @navigation @history
  Scenario: Track navigation history
    Given I have navigated through multiple segments
    When I check the navigation history
    Then it should:
      | History Check                             |
      | Show visited segments in order            |
      | Allow backward navigation                 |
      | Allow forward navigation                  |
      | Maintain history across sessions          |

  @navigation @scroll
  Scenario: Remember scroll positions
    Given I have scrolled to a specific position
    When I navigate away and return
    Then the view should:
      | Scroll Check                              |
      | Restore previous scroll position          |
      | Maintain position across sessions         |
      | Handle content reflow                     |
      | Smooth scroll to position                 |

  @navigation @error
  Scenario Outline: Handle navigation errors
    Given a navigation request to <destination>
    When <error_condition> occurs
    Then the system should:
      | Error Handling                            |
      | Show appropriate error message            |
      | Maintain current state                    |
      | Provide recovery options                  |
      | Log error details                         |

    Examples:
      | destination    | error_condition           |
      | segment       | segment deleted           |
      | sequence      | sequence corrupted        |
      | position      | content changed           |
      | history       | history cleared           |

  @navigation @progress
  Scenario: Show navigation progress
    Given a navigation to a distant segment
    When the navigation starts
    Then it should:
      | Progress Check                            |
      | Show progress indicator                   |
      | Update progress status                    |
      | Allow navigation cancellation             |
      | Complete with success/failure notice      |

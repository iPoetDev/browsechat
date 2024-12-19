Feature: Open Chat Browser Command
  As a VS Code user
  I want to open the chat browser with a log file
  So that I can view and navigate through my chat conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @command @smoke
  Scenario: Open chat browser from command palette
    When I execute "Browse Chat: Open Browser" from command palette
    Then I should see a file picker
    And the file picker should:
      | Requirement                               |
      | Only show .log files                      |
      | Allow single file selection               |
      | Show file size information                |
      | Support file browsing                     |

  @command @validation
  Scenario Outline: Validate file selection
    Given I select a log file with <condition>
    When I try to open it in the browser
    Then I should see <result>

    Examples:
      | condition           | result                           |
      | size > 10MB        | size limit error message         |
      | invalid format     | invalid file error message       |
      | empty file         | empty file error message         |
      | valid content      | successfully opened browser      |

  @command @progress
  Scenario: Show progress for large files
    Given I select a valid log file of 5MB
    When the file is being loaded
    Then I should see:
      | Progress Indicator                         |
      | Loading percentage                         |
      | Cancel option                             |
      | Operation status                          |
      | Time remaining estimate                    |

  @command @webview
  Scenario: Initialize WebView panel
    Given a valid log file is selected
    When the browser opens
    Then the WebView panel should:
      | Panel Check                               |
      | Load with correct title                   |
      | Show file content                         |
      | Maintain VS Code theme                    |
      | Enable interaction                        |

  @command @state
  Scenario: Maintain browser state
    Given the chat browser is open
    When I <action> the WebView panel
    Then the browser should <result>

    Examples:
      | action         | result                           |
      | close         | save current state               |
      | reopen        | restore previous state           |
      | move          | maintain content                 |
      | resize        | adjust layout                    |

  @command @error
  Scenario: Handle error conditions
    Given an error occurs during browser opening
    Then I should see:
      | Error Handling                            |
      | Clear error message                       |
      | Suggested resolution                      |
      | Option to retry                          |
      | Error details if needed                   |

  @command @integration
  Scenario: Command palette integration
    When I open the command palette
    Then I should see:
      | Command Integration                        |
      | Clear command name                         |
      | Keyboard shortcut                          |
      | Command category                          |
      | Command enabled state                      |

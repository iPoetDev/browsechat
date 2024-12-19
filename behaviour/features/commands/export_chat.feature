Feature: Export Chat Command
  As a VS Code user
  I want to export chat segments
  So that I can share or archive specific conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat segments are available

  @command @selection
  Scenario: Select segments for export
    When I execute "Browse Chat: Export Chat"
    Then I should see a selection interface with:
      | Selection Options                         |
      | Multiple segment selection                |
      | Select all option                         |
      | Segment previews                          |
      | Selection count                           |
      | Clear selection option                    |

  @command @format
  Scenario: Choose export format
    Given I have selected segments to export
    When I proceed to format selection
    Then I should see options for:
      | Export Format                             |
      | Plain text (.txt)                         |
      | Markdown (.md)                            |
      | HTML (.html)                              |
      | JSON (.json)                              |
      | Custom format                             |

  @command @progress
  Scenario: Show export progress
    Given I have selected segments and format
    When the export begins
    Then I should see:
      | Progress Information                      |
      | Percentage complete                       |
      | Number of segments processed              |
      | Estimated time remaining                  |
      | Cancel option                             |

  @command @validation
  Scenario Outline: Validate export content
    Given segments with <content_type>
    When exporting to <format>
    Then the system should <action>

    Examples:
      | content_type    | format    | action                           |
      | plain text     | txt       | preserve formatting              |
      | code blocks    | md        | maintain code structure          |
      | metadata       | json      | include all metadata             |
      | formatting     | html      | preserve styling                 |

  @command @output
  Scenario: Create export file
    Given export options are selected
    When I confirm the export
    Then the system should:
      | File Creation Check                       |
      | Show save dialog                          |
      | Suggest appropriate filename              |
      | Create valid output file                  |
      | Maintain file permissions                 |

  @command @notification
  Scenario: Show export status
    Given an export operation is complete
    Then I should see a notification with:
      | Status Information                        |
      | Success/failure status                    |
      | Number of segments exported               |
      | Output file location                      |
      | Option to open exported file              |

  @command @cancellation
  Scenario: Handle export cancellation
    Given an export is in progress
    When I cancel the operation
    Then the system should:
      | Cancellation Action                       |
      | Stop the export immediately               |
      | Clean up temporary files                  |
      | Show cancellation notification            |
      | Return to previous state                  |

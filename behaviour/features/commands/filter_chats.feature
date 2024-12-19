Feature: Filter Chat Command
  As a VS Code user
  I want to filter chat segments by metadata
  So that I can focus on specific aspects of conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat logs are loaded

  @command @filter
  Scenario: Apply metadata filters
    When I execute "Browse Chat: Filter"
    Then I should see a filter interface with:
      | Filter Options                            |
      | Speaker selection                         |
      | Date range picker                         |
      | Keyword filters                           |
      | Content type filters                      |
      | Length filters                            |

  @command @combination
  Scenario: Combine multiple filters
    Given the filter interface is open
    When I select multiple filter criteria:
      | Filter Type    | Value                    |
      | Speaker        | "Me"                     |
      | Date           | "Last 7 days"            |
      | Keywords       | ["important", "urgent"]   |
    Then results should show only matching segments

  @command @preview
  Scenario: Preview filtered results
    Given I have selected filter criteria
    When the preview updates
    Then I should see:
      | Preview Information                       |
      | Matching segment count                    |
      | Sample matches                            |
      | Applied filters summary                   |
      | Option to modify filters                  |

  @command @realtime
  Scenario: Update results in real-time
    Given active filters are applied
    When chat content changes
    Then the system should:
      | Real-time Update                          |
      | Reapply filters automatically             |
      | Update result count                       |
      | Refresh preview                           |
      | Maintain filter state                     |

  @command @persistence
  Scenario: Persist filter settings
    Given I have configured filters
    When I <action> VS Code
    Then my filters should <result>

    Examples:
      | action         | result                           |
      | close         | be saved                         |
      | reopen        | be restored                      |
      | switch files  | remain active                    |
      | reset         | return to defaults               |

  @command @status
  Scenario: Show filter status
    Given filters are active
    Then I should see:
      | Status Indicator                          |
      | Number of active filters                  |
      | Quick filter summary                      |
      | Clear filters option                      |
      | Filter modification option                |

  @command @nomatch
  Scenario: Handle no matching results
    Given filters that result in no matches
    Then the system should:
      | No-Match Handling                         |
      | Show clear message                        |
      | Suggest filter adjustments                |
      | Offer to clear filters                    |
      | Maintain filter state                     |

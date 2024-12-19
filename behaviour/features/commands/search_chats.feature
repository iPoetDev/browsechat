Feature: Search in Chats Command
  As a VS Code user
  I want to search through chat segments
  So that I can find specific content or conversations

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat logs are loaded

  @command @search
  Scenario: Perform basic search
    When I execute "Browse Chat: Search Chats"
    Then I should see a search interface with:
      | Search Interface Element                  |
      | Search input field                        |
      | Case sensitivity toggle                   |
      | Regex support toggle                      |
      | Search scope selector                     |
      | Recent searches                           |

  @command @results
  Scenario: Display search results
    Given I enter a search query
    When the search completes
    Then results should show:
      | Result Information                        |
      | Total matches count                       |
      | Match preview with context                |
      | File location                             |
      | Timestamp information                     |
      | Navigation controls                       |

  @command @performance
  Scenario: Meet search performance targets
    Given chat logs of various sizes
    When performing searches
    Then the system should:
      | Performance Target                        |
      | Complete within 500ms                     |
      | Show progressive results                  |
      | Maintain UI responsiveness                |
      | Handle large result sets                  |

  @command @highlighting
  Scenario: Highlight search matches
    Given search results are displayed
    Then matches should be:
      | Highlight Feature                         |
      | Visually distinct                         |
      | Consistent across results                 |
      | Visible in context                        |
      | Navigable with keyboard                   |

  @command @options
  Scenario: Configure search options
    When I open search options
    Then I should be able to set:
      | Search Option                             |
      | Case sensitivity                          |
      | Whole word match                          |
      | Regular expression                        |
      | Include metadata                          |
      | Search scope                              |

  @command @history
  Scenario: Manage search history
    Given I have performed searches
    When I view search history
    Then I should see:
      | History Feature                           |
      | Recent search queries                     |
      | Used search options                       |
      | Result counts                             |
      | Option to clear history                   |

  @command @navigation
  Scenario: Navigate search results
    Given search results are displayed
    Then I should be able to:
      | Navigation Action                         |
      | Jump between results                      |
      | Use keyboard shortcuts                    |
      | See current position                      |
      | Return to original location               |

  @command @nomatch
  Scenario: Handle no matches
    Given a search with no results
    Then the system should:
      | No-Match Handling                         |
      | Show clear message                        |
      | Suggest search modifications              |
      | Offer search scope changes                |
      | Maintain previous state                   |

Feature: Workspace Detection Configuration
  As a VS Code user
  I want to configure how chat logs are detected in my workspace
  So that I can control automatic log discovery and monitoring

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @settings @modes
  Scenario: Configure detection modes
    When I update browsechat.detection.mode setting
    Then the following modes should work:
      | Mode      | Behavior                          |
      | manual    | Only use configured paths         |
      | auto      | Automatically discover logs       |
    And mode changes should:
      | Update Action                             |
      | Take effect immediately                   |
      | Update file watchers                      |
      | Respect existing configurations           |
      | Show mode status                          |

  @settings @depth
  Scenario: Control search depth
    Given workspace detection is enabled
    When I set search depth to <depth>
    Then the search should:
      | Depth Control                             |
      | Respect maximum depth                     |
      | Skip deeper directories                   |
      | Show search progress                      |
      | Report skipped locations                  |

    Examples:
      | depth  |
      | 1      |
      | 2      |
      | 5      |
      | 0      |

  @settings @exclusions
  Scenario: Handle exclusion patterns
    When I configure exclusion patterns
    Then the system should:
      | Exclusion Handling                        |
      | Skip matching directories                 |
      | Support glob patterns                     |
      | Respect VS Code excludes                  |
      | Allow pattern modification                |
      | Update immediately                        |

  @settings @performance
  Scenario: Optimize detection performance
    Given a large workspace
    When detection runs
    Then it should:
      | Performance Check                         |
      | Complete within reasonable time           |
      | Show progress indicator                   |
      | Allow cancellation                        |
      | Free resources after completion           |
      | Cache results appropriately               |

  @settings @status
  Scenario: Show detection status
    Given detection is running
    Then the status UI should show:
      | Status Information                        |
      | Current detection mode                    |
      | Files/directories processed               |
      | Logs found                               |
      | Excluded locations                        |
      | Error conditions                          |

  @settings @updates
  Scenario: Handle workspace changes
    Given detection is configured
    When workspace <change> occurs
    Then detection should:
      | Update Behavior                           |
      | Re-scan affected areas                    |
      | Maintain existing results                 |
      | Update file watchers                      |
      | Show change notifications                 |

    Examples:
      | change           |
      | files added      |
      | files deleted    |
      | paths modified   |
      | settings updated |

  @settings @vscode
  Scenario: Respect VS Code patterns
    Given VS Code search exclude patterns
    When detection runs
    Then it should:
      | VS Code Integration                       |
      | Use workspace exclude patterns            |
      | Respect search.exclude settings           |
      | Handle files.exclude patterns             |
      | Update with VS Code changes               |
      | Show applied exclusions                   |

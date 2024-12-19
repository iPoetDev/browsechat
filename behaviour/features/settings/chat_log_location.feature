Feature: Chat Log Location Configuration
  As a VS Code user
  I want to configure chat log locations
  So that the extension can easily find and monitor my chat log files

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @settings @paths
  Scenario: Configure multiple log directories
    When I update browsechat.logs.directories setting
    Then I should be able to:
      | Directory Configuration                   |
      | Add multiple directory paths              |
      | Use absolute paths                        |
      | Use relative paths                        |
      | Use environment variables                 |
      | Use workspace variables                   |

  @settings @validation
  Scenario Outline: Validate path configurations
    Given I set a log directory to <path>
    When the path is validated
    Then it should <result>

    Examples:
      | path                      | result                           |
      | ${workspaceFolder}/logs   | resolve to absolute path         |
      | %USERPROFILE%/logs        | resolve environment variable     |
      | ./logs                    | resolve relative path            |
      | invalid/path              | show validation error            |
      | /root/restricted          | show permission error            |

  @settings @monitoring
  Scenario: Monitor path availability
    Given configured log directories
    When a directory becomes <state>
    Then the extension should:
      | Monitoring Action                         |
      | Update path status                        |
      | Show appropriate notification             |
      | Update file watchers                      |
      | Maintain other valid paths                |

    Examples:
      | state          |
      | unavailable    |
      | available      |
      | permission-denied |
      | deleted        |

  @settings @ui
  Scenario: Use path selection UI
    When I open the path selection interface
    Then I should see:
      | UI Element                               |
      | Current configured paths                  |
      | Add path button                          |
      | Remove path button                        |
      | Path validation status                    |
      | Browse button                            |

  @settings @persistence
  Scenario: Persist path configurations
    Given I have configured log directories
    When I <action> VS Code
    Then my path configurations should:
      | Persistence Check                         |
      | Be saved correctly                        |
      | Be restored on restart                    |
      | Maintain validity status                  |
      | Preserve monitoring state                 |

    Examples:
      | action    |
      | close     |
      | reload    |
      | update    |
      | reset     |

  @settings @watchers
  Scenario: Update file watchers
    Given configured log directories
    When path configurations change
    Then file watchers should:
      | Watcher Update                           |
      | Stop watching removed paths               |
      | Start watching new paths                  |
      | Update watched file types                 |
      | Respect VS Code file watch limits         |

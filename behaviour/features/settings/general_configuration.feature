Feature: General Configuration Options
  As a VS Code user
  I want to configure general extension behavior
  So that I can customize the chat browser experience

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @settings @filesize
  Scenario: Enforce file size limits
    When I update browsechat.general.maxFileSize setting
    Then the system should:
      | Size Limit Check                          |
      | Enforce maximum file size                 |
      | Show size warnings                        |
      | Prevent oversized file loading            |
      | Display file sizes                        |
      | Allow size limit adjustment               |

  @settings @autoopen
  Scenario: Control auto-open behavior
    Given browsechat.general.autoOpen is <setting>
    When I <action> a log file
    Then the browser should <result>

    Examples:
      | setting    | action         | result                    |
      | true       | open           | open automatically        |
      | false      | open           | wait for command          |
      | true       | select         | preview content           |
      | false      | select         | show info only            |

  @settings @theme
  Scenario: Configure theme settings
    When I set browsechat.general.theme to <theme>
    Then the UI should:
      | Theme Behavior                            |
      | Match VS Code theme                       |
      | Update immediately                        |
      | Apply consistent styling                  |
      | Maintain accessibility                    |

    Examples:
      | theme     |
      | auto      |
      | light     |
      | dark      |

  @settings @caching
  Scenario: Manage caching settings
    Given browsechat.general.caching configuration
    When caching is <state>
    Then the system should:
      | Cache Management                          |
      | Respect enabled state                     |
      | Apply size limits                         |
      | Clear cache when needed                   |
      | Show cache status                         |
      | Handle cache errors                       |

    Examples:
      | state             |
      | enabled           |
      | disabled          |
      | size-limited      |
      | error-state       |

  @settings @documentation
  Scenario: Access setting documentation
    When viewing setting documentation
    Then it should show:
      | Documentation Element                     |
      | Setting descriptions                      |
      | Default values                           |
      | Valid ranges/options                      |
      | Example configurations                    |
      | Related settings                          |

  @settings @validation
  Scenario: Validate setting values
    When updating <setting> to <value>
    Then validation should:
      | Validation Check                          |
      | Verify value type                         |
      | Check valid range                         |
      | Ensure dependencies                       |
      | Show validation errors                    |
      | Suggest corrections                       |

    Examples:
      | setting           | value          |
      | maxFileSize       | negative       |
      | theme             | invalid        |
      | caching.maxSize   | too large      |
      | autoOpen         | non-boolean    |

  @settings @updates
  Scenario: Apply setting updates
    Given a setting change
    Then the system should:
      | Update Behavior                           |
      | Apply changes immediately                 |
      | Update affected components                |
      | Maintain consistency                      |
      | Show update status                        |
      | Handle update failures                    |

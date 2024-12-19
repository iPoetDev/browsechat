Feature: Command Integration
  As a VS Code extension developer
  I want proper integration of all commands
  So that users have a consistent and reliable experience

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated

  @integration @state
  Scenario: Manage command state
    Given various extension states
    Then commands should be:
      | Command                | State when <condition>        |
      | Open Browser          | Enabled always                |
      | Jump to Chat          | Enabled with open logs        |
      | Export Chat           | Enabled with selections       |
      | Search Chats          | Enabled with indexed content  |
      | Filter               | Enabled with loaded data      |

  @integration @availability
  Scenario Outline: Control command availability
    Given the extension is in <state>
    When checking command availability
    Then <command> should be <availability>

    Examples:
      | state          | command        | availability        |
      | initializing   | all            | disabled            |
      | ready          | basic          | enabled             |
      | processing     | modification   | disabled            |
      | error          | recovery       | enabled             |

  @integration @shortcuts
  Scenario: Implement keyboard shortcuts
    Given the extension is active
    Then the following shortcuts should:
      | Shortcut      | Command               | Behavior          |
      | Ctrl+B        | Open Browser          | No conflicts      |
      | Ctrl+J        | Jump to Chat          | Global scope      |
      | Ctrl+E        | Export               | Context aware     |
      | Ctrl+F        | Search               | Override safe     |
      | Ctrl+L        | Filter               | When available    |

  @integration @history
  Scenario: Track command history
    When commands are executed
    Then the history should:
      | History Feature                           |
      | Record command sequence                   |
      | Track parameters                          |
      | Store results                            |
      | Enable undo/redo                         |
      | Persist across sessions                  |

  @integration @errors
  Scenario: Handle command errors
    Given a command execution
    When an error occurs
    Then the system should:
      | Error Handling                           |
      | Show clear error message                 |
      | Log error details                        |
      | Offer recovery options                   |
      | Maintain stable state                    |
      | Prevent cascading failures               |

  @integration @telemetry
  Scenario: Collect command telemetry
    Given user has opted in to telemetry
    When commands are used
    Then collect:
      | Telemetry Data                           |
      | Command usage frequency                   |
      | Performance metrics                       |
      | Error rates                              |
      | Feature adoption                         |
      | User patterns                            |

  @integration @chaining
  Scenario: Support command chaining
    Given multiple related commands
    When creating a command chain
    Then the system should:
      | Chain Requirement                         |
      | Maintain execution order                  |
      | Share context between commands            |
      | Handle errors gracefully                  |
      | Allow chain cancellation                  |
      | Preserve state on failure                 |

  @integration @performance
  Scenario: Monitor command performance
    When commands are executed
    Then the system should:
      | Performance Check                         |
      | Meet VS Code response times               |
      | Minimize UI blocking                      |
      | Handle concurrent commands                |
      | Maintain extension stability              |
      | Scale with workspace size                 |

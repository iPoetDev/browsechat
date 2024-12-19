Feature: Tree View Navigation
  As a VS Code user
  I want a tree view for chat history navigation
  So that I can quickly browse and access different chat segments

  Background:
    Given VS Code is running
    And the BrowseChat extension is activated
    And chat log files are loaded

  @treeview @smoke
  Scenario: Display chat history tree
    When the tree view is initialized
    Then it should:
      | Display Check                             |
      | Show all loaded chat sequences            |
      | Use appropriate icons for items           |
      | Display relevant metadata                 |
      | Support expansion/collapse                |
      | Handle up to 1000 items                   |

  @treeview @virtualscroll
  Scenario: Handle large chat logs
    Given a chat log with over 1000 segments
    When the tree view is rendered
    Then it should:
      | Scroll Behavior                           |
      | Implement virtual scrolling               |
      | Load items on-demand                      |
      | Maintain smooth scrolling                 |
      | Free memory for off-screen items          |
      | Update visible items efficiently          |

  @treeview @decoration
  Scenario: Show tree item decorations
    Given chat segments with different states
    Then tree items should display:
      | Decoration Type   | Visual Indicator        |
      | Unread segments   | Bold text               |
      | Active segment    | Highlight               |
      | Error state      | Error icon              |
      | Modified content | Modified badge          |
      | Filtered items   | Dimmed appearance       |

  @treeview @contextmenu
  Scenario: Provide context menu actions
    Given a selected tree item
    When right-clicking the item
    Then the context menu should show:
      | Action                | Result                  |
      | Jump to Chat         | Navigate to segment     |
      | Copy Content         | Copy to clipboard       |
      | Export Segment       | Save to file            |
      | Mark as Read         | Update segment state    |
      | Show in Editor       | Open in text editor     |

  @treeview @refresh
  Scenario: Update tree view state
    Given the tree view is displaying chat data
    When <change_event> occurs
    Then the tree view should:
      | Update Action                             |
      | Refresh affected items                    |
      | Maintain expansion state                  |
      | Preserve selection                        |
      | Update decorations                        |

    Examples:
      | change_event           |
      | new segment added      |
      | segment modified       |
      | segment deleted        |
      | metadata updated       |

  @treeview @filter
  Scenario: Filter tree view items
    Given the tree view contains multiple segments
    When applying filter "<filter_type>"
    Then the tree view should:
      | Filter Behavior                           |
      | Show only matching items                  |
      | Update item count                         |
      | Maintain parent/child relationships       |
      | Allow multiple filters                    |

    Examples:
      | filter_type           |
      | by date              |
      | by participant       |
      | by keyword           |
      | by content           |

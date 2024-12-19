import * as vscode from "vscode";
import {
  ChatTreeProvider,
  ChatTreeItem,
} from "../../../src/ui/ChatTreeProvider";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatSegment,
  ChatSequence,
  ChatMetadata,
} from "../../../src/models/types";
import { DataModelEventType } from "../../../src/models/events";

jest.mock("vscode");

describe("ChatTreeItem", () => {
  let sequenceItem: ChatTreeItem;
  let segmentItem: ChatTreeItem;

  beforeEach(() => {
    sequenceItem = new ChatTreeItem(
      "seq1",
      "test.log (3 segments)",
      vscode.TreeItemCollapsibleState.Collapsed,
      "sequence",
      {
        segmentCount: 3,
        participants: ["User", "Assistant"],
        keywords: ["test"],
        length: 100,
      }
    );

    segmentItem = new ChatTreeItem(
      "seg1",
      "Test content...",
      vscode.TreeItemCollapsibleState.None,
      "segment",
      {
        participants: ["User", "Assistant"],
        keywords: ["test", "content"],
        length: 20,
      }
    );
  });

  describe("Initialization", () => {
    it("should create sequence item with correct properties", () => {
      expect(sequenceItem.id).toBe("seq1");
      expect(sequenceItem.label).toBe("test.log (3 segments)");
      expect(sequenceItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
      expect(sequenceItem.contextValue).toBe("sequence");
    });

    it("should create segment item with correct properties", () => {
      expect(segmentItem.id).toBe("seg1");
      expect(segmentItem.label).toBe("Test content...");
      expect(segmentItem.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.None
      );
      expect(segmentItem.contextValue).toBe("segment");
    });
  });

  describe("Tooltip Generation", () => {
    it("should generate correct tooltip for sequence", () => {
      expect(sequenceItem.tooltip).toContain("test.log (3 segments)");
      expect(sequenceItem.tooltip).toContain("Segments: 3");
      expect(sequenceItem.tooltip).toContain("Participants: User, Assistant");
    });

    it("should generate correct tooltip for segment", () => {
      expect(segmentItem.tooltip).toContain("Test content...");
      expect(segmentItem.tooltip).toContain("Participants: User, Assistant");
      expect(segmentItem.tooltip).toContain("Keywords: test, content");
    });
  });

  describe("Icon Generation", () => {
    it("should use notebook icon for sequence", () => {
      expect(sequenceItem.iconPath).toEqual(new vscode.ThemeIcon("notebook"));
    });

    it("should use comment icon for segment", () => {
      expect(segmentItem.iconPath).toEqual(new vscode.ThemeIcon("comment"));
    });
  });
});

describe("ChatTreeProvider", () => {
  let provider: ChatTreeProvider;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockSequence: ChatSequence;
  let mockSegments: ChatSegment[];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    //   // Mock extension URI mockExtensionUri = { fsPath: "/test/extension/path", with: jest.fn().mockReturnThis(),
    //   path: "/test/extension/path", } as unknown as vscode.Uri;

    // Mock segments
    const mockSegment1: ChatSegment = {
      id: "segment1",
      sequenceId: "sequence1",
      content: "Test content 1",
      startIndex: 0,
      endIndex: 14,
      metadata: {
        participants: ["User", "Assistant"],
        keywords: ["test"],
        timestamp: "2024-01-01",
        length: 34,
        merge: function (other: ChatMetadata): ChatMetadata {
          throw new Error("Function not implemented.");
        },
      },
      timestamp: new Date(),
    };

    const mockSegment2: ChatSegment = {
      id: "segment2",
      sequenceId: "sequence1",
      content: "Test content 2",
      startIndex: 14,
      endIndex: 28,
      metadata: {
        participants: ["User", "Assistant"],
        keywords: ["test"],
        timestamp: "2024-01-01",
        length: 34,
        merge: function (other: ChatMetadata): ChatMetadata {
          throw new Error("Function not implemented.");
        },
      },
      timestamp: new Date(),
    };

    mockSegments = [mockSegment1, mockSegment2];

    // Mock sequence
    mockSequence = {
      id: "sequence1",
      sourceFile: "test.log",
      segments: mockSegments,
      totalSegments: 2,
      metadata: {
        participants: ["User", "Assistant"],
        keywords: ["test"],
        length: 28,
        sourceFile: "test.log",
        merge: function (other: ChatMetadata): ChatMetadata {
          throw new Error("Function not implemented.");
        },
        size: 1024,
        lastModified: "2024-01-01",
        segmentCount: 2,
      },
      withSegments: function (newSegments: ChatSegment[]): ChatSequence {
        return {
          ...this,
          segments: newSegments,
          totalSegments: newSegments.length,
        };
      },
    };

    // Mock DataModelManager
    mockDataModel = {
      on: jest.fn(),
      getAllSequences: jest.fn().mockReturnValue([mockSequence]),
      getSequenceSegments: jest.fn().mockReturnValue(mockSegments),
      getSegment: jest.fn().mockReturnValue(mockSegments[0]),
      getSequence: jest.fn().mockReturnValue(mockSequence),
    } as unknown as jest.Mocked<DataModelManager>;

    // Mock vscode.window
    (vscode.window.createTextEditorDecorationType as jest.Mock).mockReturnValue(
      {
        dispose: jest.fn(),
      }
    );

    // Create provider instance
    provider = new ChatTreeProvider(mockDataModel);
  });

  describe("Initialization", () => {
    it("should register data model event listeners", () => {
      expect(mockDataModel.on).toHaveBeenCalledWith(
        DataModelEventType.SequenceCreated,
        expect.any(Function)
      );
      expect(mockDataModel.on).toHaveBeenCalledWith(
        DataModelEventType.SequenceUpdated,
        expect.any(Function)
      );
      expect(mockDataModel.on).toHaveBeenCalledWith(
        DataModelEventType.SegmentCreated,
        expect.any(Function)
      );
      expect(mockDataModel.on).toHaveBeenCalledWith(
        DataModelEventType.SegmentUpdated,
        expect.any(Function)
      );
    });

    it("should initialize decorations", () => {
      expect(
        vscode.window.createTextEditorDecorationType
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe("Tree Data Provider", () => {
    it("should return root level items", async () => {
      const children = await provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe("seq1");
      expect(children[0].type).toBe("sequence");
    });

    it("should return sequence children", async () => {
      const rootItems = await provider.getChildren();
      const children = await provider.getChildren(rootItems[0]);
      expect(children).toHaveLength(2);
      expect(children[0].id).toBe("segment1");
      expect(children[0].type).toBe("segment");
    });

    it("should return empty array for segment children", async () => {
      const rootItems = await provider.getChildren();
      const sequenceChildren = await provider.getChildren(rootItems[0]);
      const segmentChildren = await provider.getChildren(sequenceChildren[0]);
      expect(segmentChildren).toHaveLength(0);
    });
  });

  describe("Tree Item Creation", () => {
    it("should create sequence tree item", async () => {
      const children = await provider.getChildren();
      const item = children[0];
      expect(item.label).toBe("test.log (2 segments)");
      expect(item.collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed
      );
    });

    it("should create segment tree item", async () => {
      const rootItems = await provider.getChildren();
      const children = await provider.getChildren(rootItems[0]);
      const item = children[0];
      expect(item.label).toContain("Test content 1");
      expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    });
  });

  describe("Active Segment Management", () => {
    it("should update active segment", async () => {
      provider.setActiveSegment("segment1");
      const rootItems = await provider.getChildren();
      const children = await provider.getChildren(rootItems[0]);
      expect(children[0].iconPath).toEqual(new vscode.ThemeIcon("arrow-right"));
    });
  });

  describe("Parent Resolution", () => {
    it("should resolve segment parent", async () => {
      const rootItems = await provider.getChildren();
      const children = await provider.getChildren(rootItems[0]);
      const parent = await provider.getParent(children[0]);
      expect(parent?.id).toBe("seq1");
      expect(parent?.type).toBe("sequence");
    });

    it("should return null for sequence parent", async () => {
      const rootItems = await provider.getChildren();
      const parent = await provider.getParent(rootItems[0]);
      expect(parent).toBeNull();
    });
  });

  describe("Segment Revelation", () => {
    it("should reveal segment", async () => {
      await provider.revealSegment("segment1");
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.treeView.reveal",
        expect.any(Object),
        expect.objectContaining({
          select: true,
          focus: true,
        })
      );
    });

    it("should expand parent sequence", async () => {
      await provider.revealSegment("segment1");
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.treeView.reveal",
        expect.any(Object),
        expect.objectContaining({
          expand: true,
        })
      );
    });
  });
});

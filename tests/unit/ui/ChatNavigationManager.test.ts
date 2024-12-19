import * as vscode from "vscode";
import { ChatNavigationManager } from "../../../src/ui/ChatNavigationManager";
import { DataModelManager } from "../../../src/models/DataModelManager";
import { ChatSegment, ChatMetadata } from "../../../src/models/types";

jest.mock("vscode");

describe("ChatNavigationManager", () => {
  let navigationManager: ChatNavigationManager;
  let dataModel: jest.Mocked<DataModelManager>;
  let mockContext: vscode.ExtensionContext;
  let mockSegment: ChatSegment;
  let mockNextSegment: ChatSegment;
  let mockPrevSegment: ChatSegment;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock vscode.commands
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
    });
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

    // Mock vscode.window
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(null);

    // Create mock segments
    mockSegment = {
      id: "segment1",
      sequenceId: "seq1",
      content: "Test content\nLine 2",
      startIndex: 0,
      endIndex: 19,
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

    mockNextSegment = {
      id: "segment2",
      sequenceId: "seq1",
      content: "Next content",
      startIndex: 20,
      endIndex: 31,
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

    mockPrevSegment = {
      id: "segment0",
      sequenceId: "seq1",
      content: "Previous content",
      startIndex: 0,
      endIndex: 15,
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

    // Mock DataModelManager
    dataModel = {
      getSegment: jest.fn().mockReturnValue(mockSegment),
      getNextSegment: jest.fn().mockReturnValue(mockNextSegment),
      getPreviousSegment: jest.fn().mockReturnValue(mockPrevSegment),
      getAllSegments: jest
        .fn()
        .mockReturnValue([mockPrevSegment, mockSegment, mockNextSegment]),
      getSequence: jest.fn().mockReturnValue({
        id: "seq1",
        sourceFile: "test.log",
        segments: [mockPrevSegment, mockSegment, mockNextSegment],
        metadata: {
          participants: ["User", "Assistant"],
          keywords: ["test"],
          length: 45,
          sourceFile: "test.log",
        },
      }),
    } as unknown as jest.Mocked<DataModelManager>;

    // Mock ExtensionContext
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Create navigation manager instance
    navigationManager = new ChatNavigationManager(dataModel, mockContext);
  });

  describe("Command Registration", () => {
    it("should register all navigation commands", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.navigation.nextSegment",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.navigation.previousSegment",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.navigation.jumpToSegment",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.navigation.showHistory",
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.navigation.navigateBack",
        expect.any(Function)
      );
    });
  });

  describe("Navigation", () => {
    it("should navigate to a segment", async () => {
      await navigationManager.navigateToSegment("segment1");

      expect(dataModel.getSegment).toHaveBeenCalledWith("segment1");
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.treeView.revealSegment",
        "segment1"
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.webview.showSegment",
        "segment1"
      );
    });

    it("should navigate to next segment", async () => {
      await navigationManager.navigateToSegment("segment1");
      await (navigationManager as any).navigateToNextSegment();

      expect(dataModel.getNextSegment).toHaveBeenCalledWith("segment1");
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.webview.showSegment",
        "segment2"
      );
    });

    it("should navigate to previous segment", async () => {
      await navigationManager.navigateToSegment("segment1");
      await (navigationManager as any).navigateToPreviousSegment();

      expect(dataModel.getPreviousSegment).toHaveBeenCalledWith("segment1");
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.webview.showSegment",
        "segment0"
      );
    });
  });

  describe("History Management", () => {
    it("should maintain navigation history", async () => {
      await navigationManager.navigateToSegment("segment0");
      await navigationManager.navigateToSegment("segment1");
      await navigationManager.navigateToSegment("segment2");

      await (navigationManager as any).navigateBack();

      expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith(
        "browsechat.webview.showSegment",
        "segment1"
      );
    });

    it("should respect max history size", async () => {
      const maxSize = (navigationManager as any).maxHistorySize;

      // Fill history beyond max size
      for (let i = 0; i < maxSize + 5; i++) {
        await navigationManager.navigateToSegment(`segment${i}`);
      }

      const history = (navigationManager as any).history;
      expect(history.length).toBeLessThanOrEqual(maxSize);
    });
  });

  describe("Quick Pick Integration", () => {
    it("should show segment picker with correct items", async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
        segment: mockSegment,
      });

      await (navigationManager as any).showJumpToSegmentPicker();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining("test.log"),
            description: expect.stringContaining("User, Assistant"),
            detail: "Test content",
          }),
        ]),
        expect.any(Object)
      );
    });

    it("should show history picker with correct items", async () => {
      await navigationManager.navigateToSegment("segment1");

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
        index: 0,
      });

      await (navigationManager as any).showNavigationHistory();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining("test.log"),
            description: expect.any(String),
            detail: "Test content",
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe("Breadcrumb Updates", () => {
    it("should update breadcrumb on navigation", async () => {
      await navigationManager.navigateToSegment("segment1");

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "browsechat.breadcrumb.update",
        expect.objectContaining({
          file: "test.log",
          sequence: "seq1",
          segment: "segment1",
        })
      );
    });
  });
});

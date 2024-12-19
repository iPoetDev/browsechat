import * as vscode from "vscode";
import { SearchChatsCommand } from "../../../src/commands/SearchChatsCommand";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatSegment,
  ChatSequence,
  ChatMetadata,
} from "../../../src/models/types";

// Mock VSCode API
jest.mock("vscode");

describe("SearchChatsCommand", () => {
  let searchChatsCommand: SearchChatsCommand;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockContext: jest.Mocked<vscode.ExtensionContext>;
  let mockPanel: jest.Mocked<vscode.WebviewPanel>;

  const createMockSequence = (segments: ChatSegment[] = []): ChatSequence => ({
    id: "seq1",
    sourceFile: "test.log",
    segments,
    totalSegments: segments.length,
    metadata: {
      participants: ["User1", "User2"],
      length: 10,
      timestamp: new Date("2024-12-16T21:19:16Z").toISOString(),
      sourceFile: "test.log",
      startTime: new Date("2024-12-16T21:19:16Z"),
      endTime: new Date("2024-12-16T21:19:26Z"),
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
      size: 1024,
      lastModified: "2024-01-01",
      segmentCount: 2,
    },
    withSegments(newSegments: ChatSegment[]): ChatSequence {
      return createMockSequence(newSegments);
    },
  });

  const mockSequence = createMockSequence();

  const mockSegment: ChatSegment = {
    id: "seg1",
    sequenceId: "seq1",
    startIndex: 0,
    endIndex: 10,
    content: "Test chat content with searchable text",
    timestamp: new Date("2024-12-16T21:19:16Z"),
    metadata: {
      participants: ["User", "Assistant"],
      keywords: ["test"],
      timestamp: "2024-01-01",
      length: 34,
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
  };

  beforeEach(() => {
    // Setup mock data model
    mockDataModel = {
      getAllSequences: jest.fn(),
      getSequenceSegments: jest.fn(),
    } as any;

    // Setup mock extension context
    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    // Setup mock webview panel
    mockPanel = {
      webview: {
        html: "",
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn(),
      },
      dispose: jest.fn(),
    } as any;

    // Mock VSCode window methods
    (vscode.window.showQuickPick as jest.Mock).mockReset();
    (vscode.window.showInputBox as jest.Mock).mockReset();
    (vscode.window.createWebviewPanel as jest.Mock).mockReset();
    (vscode.window.withProgress as jest.Mock).mockReset();
    (vscode.commands.registerCommand as jest.Mock).mockReset();

    // Mock default data
    mockDataModel.getAllSequences.mockReturnValue([mockSequence]);
    mockDataModel.getSequenceSegments.mockReturnValue([mockSegment]);
    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);

    // Create command instance
    searchChatsCommand = new SearchChatsCommand(mockDataModel, mockContext);
  });

  describe("Command Registration", () => {
    it("should register search command", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.searchChats",
        expect.any(Function)
      );
      expect(mockContext.subscriptions.length).toBe(1);
    });
  });

  describe("Search History", () => {
    it("should load search history on initialization", () => {
      expect(mockContext.globalState.get).toHaveBeenCalledWith(
        "browsechat.searchHistory",
        []
      );
    });

    it("should save search history when updated", async () => {
      const searchQuery = "test query";
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([]) // options
        .mockResolvedValueOnce({ id: "all" }) // scope
        .mockResolvedValueOnce({ label: "$(search) Enter search query..." });
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(
        searchQuery
      );

      await searchChatsCommand.execute();

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "browsechat.searchHistory",
        expect.arrayContaining([searchQuery])
      );
    });

    it("should maintain max history size", async () => {
      const existingHistory = Array(10).fill("old query");
      (mockContext.globalState.get as jest.Mock).mockReturnValue(
        existingHistory
      );

      const newQuery = "new query";
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([]) // options
        .mockResolvedValueOnce({ id: "all" }) // scope
        .mockResolvedValueOnce({ label: "$(search) Enter search query..." });
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(newQuery);

      await searchChatsCommand.execute();

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "browsechat.searchHistory",
        expect.arrayContaining([newQuery])
      );
      const updateCall = (mockContext.globalState.update as jest.Mock).mock
        .calls[0];
      expect(updateCall[1].length).toBe(10);
    });
  });

  describe("Search Options", () => {
    it("should handle case sensitive option", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([{ label: "$(case-sensitive) Case Sensitive" }])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: "test" });

      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain("Found");
    });

    it("should handle regex option", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([{ label: "$(regex) Use Regular Expression" }])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: "test\\w+" });

      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain("Found");
    });

    it("should handle search scope selection", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ id: "current" })
        .mockResolvedValueOnce({ label: "test" });

      await searchChatsCommand.execute();

      expect(mockDataModel.getAllSequences).toHaveBeenCalled();
    });
  });

  describe("Search Execution", () => {
    it("should perform case-sensitive search", async () => {
      const query = "Test";
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([{ label: "$(case-sensitive) Case Sensitive" }])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: query });

      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain("highlight");
      expect(mockPanel.webview.html).toContain(query);
    });

    it("should perform regex search", async () => {
      const query = "chat\\s+\\w+";
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([{ label: "$(regex) Use Regular Expression" }])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: query });

      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain("highlight");
    });

    it("should handle invalid regex patterns", async () => {
      const query = "[invalid(regex";
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([{ label: "$(regex) Use Regular Expression" }])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: query });

      await searchChatsCommand.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Invalid regular expression")
      );
    });

    it("should handle search cancellation", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: "test" });

      (vscode.window.withProgress as jest.Mock).mockImplementation(
        (_, callback) =>
          callback({ report: jest.fn() }, { isCancellationRequested: true })
      );

      await searchChatsCommand.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Search cancelled")
      );
    });
  });

  describe("Results Display", () => {
    beforeEach(() => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: "test" });
    });

    it("should display search results with matches", async () => {
      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain("Found");
      expect(mockPanel.webview.html).toContain(mockSequence.sourceFile);
      expect(mockPanel.webview.html).toContain("highlight");
    });

    it("should format timestamps in results", async () => {
      await searchChatsCommand.execute();

      expect(mockPanel.webview.html).toContain(
        mockSegment.timestamp.toLocaleString()
      );
    });

    it("should handle webview messages", async () => {
      await searchChatsCommand.execute();

      const messageCallback = jest.fn();
      (mockPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(
        (callback) => {
          callback({ command: "jumpToResult", index: 0 });
          return { dispose: jest.fn() };
        }
      );

      // TODO: Add assertions for jump to result when implemented
    });

    it("should show progressive results", async () => {
      const segments = Array(10).fill(mockSegment);
      mockDataModel.getSequenceSegments.mockReturnValue(segments);

      await searchChatsCommand.execute();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(3); // Initial + 1 progressive + Final
    });
  });

  describe("Error Handling", () => {
    it("should handle data model errors", async () => {
      mockDataModel.getAllSequences.mockImplementation(() => {
        throw new Error("Data model error");
      });

      await searchChatsCommand.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Search failed: Data model error"
      );
    });

    it("should handle webview creation errors", async () => {
      (vscode.window.createWebviewPanel as jest.Mock).mockImplementation(() => {
        throw new Error("Webview error");
      });

      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ id: "all" })
        .mockResolvedValueOnce({ label: "test" });

      await searchChatsCommand.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Search failed: Webview error"
      );
    });
  });
});

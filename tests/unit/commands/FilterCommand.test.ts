import * as vscode from "vscode";
import { FilterCommand } from "../../../src/commands/FilterCommand";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatSegment,
  ChatSequence,
  ChatMetadata,
} from "../../../src/models/types";
import { DataModelEventType } from "../../../src/models/events";

// Mock VSCode API
jest.mock("vscode");

describe("FilterCommand", () => {
  let filterCommand: FilterCommand;
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
      timestamp: "2024-12-16T21:19:16Z",
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

  const createMockSegment = (
    overrides: Partial<ChatSegment> = {}
  ): ChatSegment => ({
    id: "seg1",
    sequenceId: "seq1",
    startIndex: 0,
    endIndex: 10,
    content: "Test chat content",
    timestamp: new Date("2024-12-16T21:19:16Z"),
    metadata: {
      timestamp: new Date("2024-12-16T21:19:16Z").toISOString(),
      participants: ["User1", "User2"],
      length: 50,
      contentType: "text/plain",
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    // Setup mock data model
    mockDataModel = {
      getAllSequences: jest.fn(),
      getSequenceSegments: jest.fn(),
      on: jest.fn(),
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

    // Create filter command instance
    filterCommand = new FilterCommand(mockDataModel, mockContext);
  });

  describe("Command Registration", () => {
    it("should register the filter command", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.filter",
        expect.any(Function)
      );
      expect(mockContext.subscriptions.length).toBe(1);
    });
  });

  describe("Filter History", () => {
    it("should load filter history on initialization", () => {
      expect(mockContext.globalState.get).toHaveBeenCalledWith(
        "browsechat.filterHistory",
        []
      );
    });

    it("should save filter history when updated", async () => {
      const criteria = { speakers: ["User1"] };
      (mockContext.globalState.get as jest.Mock).mockReturnValue([]);

      // Simulate filter execution
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce(["User1"]);

      await filterCommand.execute();

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "browsechat.filterHistory",
        [criteria]
      );
    });

    it("should maintain max history size", async () => {
      const existingHistory = Array(5).fill({ speakers: ["OldUser"] });
      (mockContext.globalState.get as jest.Mock).mockReturnValue(
        existingHistory
      );

      // Simulate new filter execution
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce(["NewUser"]);

      await filterCommand.execute();

      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "browsechat.filterHistory",
        expect.arrayContaining([{ speakers: ["NewUser"] }])
      );
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        "browsechat.filterHistory",
        expect.any(Array)
      );
      const updateCall = (mockContext.globalState.update as jest.Mock).mock
        .calls[0];
      expect(updateCall[1].length).toBe(5);
    });
  });

  describe("Filter Criteria Selection", () => {
    it("should handle speaker selection", async () => {
      const mockSequences = [createMockSequence()];
      const mockSegments = [createMockSegment()];
      mockDataModel.getAllSequences.mockReturnValue(mockSequences);
      mockDataModel.getSequenceSegments.mockReturnValue(mockSegments);

      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce([{ label: "User1" }]);

      await filterCommand.execute();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: "User1" }),
          expect.objectContaining({ label: "User2" }),
        ]),
        expect.any(Object)
      );
    });

    it("should handle date range selection", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(calendar) Date Range"])
        .mockResolvedValueOnce({ label: "Last 7 days", days: 7 });

      await filterCommand.execute();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: "Last 7 days", days: 7 }),
        ]),
        expect.any(Object)
      );
    });

    it("should handle keywords selection", async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce([
        "$(tag) Keywords",
      ]);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(
        "test, keyword"
      );

      await filterCommand.execute();

      expect(vscode.window.showInputBox).toHaveBeenCalledWith(
        expect.objectContaining({
          placeHolder: "Enter keywords (comma-separated)",
        })
      );
    });

    it("should handle content type selection", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(symbol-misc) Content Type"])
        .mockResolvedValueOnce(["Text", "Code"]);

      await filterCommand.execute();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining(["Text", "Code"]),
        expect.any(Object)
      );
    });

    it("should handle length range selection", async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce([
        "$(arrow-both) Length Range",
      ]);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(
        "100-500"
      );

      await filterCommand.execute();

      expect(vscode.window.showInputBox).toHaveBeenCalledWith(
        expect.objectContaining({
          placeHolder:
            'Enter length range (e.g., "100-500" or ">1000" or "<500")',
        })
      );
    });
  });

  describe("Filter Application", () => {
    const mockSequence = createMockSequence();
    const mockSegment = createMockSegment();

    beforeEach(() => {
      mockDataModel.getAllSequences.mockReturnValue([mockSequence]);
      mockDataModel.getSequenceSegments.mockReturnValue([mockSegment]);
      (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(
        mockPanel
      );
      (vscode.window.withProgress as jest.Mock).mockImplementation(
        (_, callback) =>
          callback({ report: jest.fn() }, { isCancellationRequested: false })
      );
    });

    it("should match segments based on speakers", async () => {
      const criteria = { speakers: ["User1"] };
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce([{ label: "User1" }]);

      await filterCommand.execute();

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("Matched: speaker");
    });

    it("should match segments based on date range", async () => {
      const now = new Date();
      const criteria = {
        dateRange: {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now,
        },
      };

      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(calendar) Date Range"])
        .mockResolvedValueOnce({ label: "Last 24 hours", days: 1 });

      await filterCommand.execute();

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("Matched: date");
    });

    it("should match segments based on keywords", async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce([
        "$(tag) Keywords",
      ]);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce("test");

      await filterCommand.execute();

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("Matched: keyword");
    });

    it("should match segments based on content type", async () => {
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(symbol-misc) Content Type"])
        .mockResolvedValueOnce(["Text"]);

      await filterCommand.execute();

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("Matched: content-type");
    });

    it("should match segments based on length range", async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce([
        "$(arrow-both) Length Range",
      ]);
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce("1-100");

      await filterCommand.execute();

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("Matched: length");
    });

    it("should handle filter cancellation", async () => {
      (vscode.window.withProgress as jest.Mock).mockImplementation(
        (_, callback) =>
          callback({ report: jest.fn() }, { isCancellationRequested: true })
      );

      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce([{ label: "User1" }]);

      await expect(filterCommand.execute()).rejects.toThrow(
        "Filtering cancelled"
      );
    });
  });

  describe("Results Display", () => {
    it("should create webview with filter results", async () => {
      const mockSequence: ChatSequence = {
        id: "1",
        sourceFile: "test.log",
        segments: [createMockSegment()],
        totalSegments: 1,
        metadata: {
          participants: ["User1", "User2"],
          length: 10,
          timestamp: "2024-12-16T21:19:16Z",
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
      };

      mockDataModel.getAllSequences.mockReturnValue([mockSequence]);
      mockDataModel.getSequenceSegments.mockReturnValue([createMockSegment()]);
      (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(
        mockPanel
      );

      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce(["$(person) Speaker"])
        .mockResolvedValueOnce([{ label: "User1" }]);

      await filterCommand.execute();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        "browsechat.filterResults",
        "Filter Results",
        vscode.ViewColumn.One,
        expect.any(Object)
      );

      expect(mockPanel.webview.html).toContain("Found 1 matching segments");
      expect(mockPanel.webview.html).toContain("test.log");
      expect(mockPanel.webview.html).toContain("Test chat content");
    });

    it("should handle webview messages", async () => {
      const mockEditor = {
        selection: new vscode.Selection(0, 0, 0, 0),
        revealRange: jest.fn(),
        setSelection: jest.fn(),
        document: {
          uri: vscode.Uri.file("test.ts"),
          fileName: "test.ts",
          isUntitled: false,
          languageId: "typescript",
          version: 1,
          isDirty: false,
          getText: jest.fn().mockReturnValue("test content"),
          getWordRangeAtPosition: jest.fn(),
          lineAt: jest.fn(),
          offsetAt: jest.fn(),
          positionAt: jest.fn(),
          save: jest.fn(),
          lineCount: 1,
          eol: vscode.EndOfLine.LF,
        },
      } as unknown as Partial<vscode.TextEditor>;

      // Mock the window.activeTextEditor getter
      Object.defineProperty(vscode.window, "activeTextEditor", {
        get: jest.fn().mockReturnValue(mockEditor),
      });

      await filterCommand.execute();

      const messageCallback = jest.fn();
      (mockPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(
        (callback) => {
          callback({ command: "jumpToResult", index: 0 });
          return { dispose: jest.fn() };
        }
      );

      expect(vscode.window.activeTextEditor).toBeDefined();
      expect(mockEditor.revealRange).toHaveBeenCalledWith(
        expect.any(vscode.Range),
        vscode.TextEditorRevealType.InCenter
      );
      expect(mockEditor.selection).toHaveBeenCalledWith(
        expect.any(vscode.Selection)
      );
      expect(messageCallback).toHaveBeenCalledTimes(1);
    });
  });
});

import * as vscode from "vscode";
import { ChatWebViewProvider } from "../../../src/ui/ChatWebViewProvider";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatSequence,
  ChatSegment,
  ChatMetadata,
} from "../../../src/models/types";

jest.mock("vscode");
jest.mock("../../../src/utils/security", () => ({
  getNonce: () => "test-nonce",
}));

describe("ChatWebViewProvider", () => {
  let provider: ChatWebViewProvider;
  let mockExtensionUri: vscode.Uri;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockSequence: ChatSequence;
  let mockSegments: ChatSegment[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock extension URI
    mockExtensionUri = {
      fsPath: "/test/extension/path",
      with: jest.fn().mockReturnThis(),
      path: "/test/extension/path",
    } as unknown as vscode.Uri;

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
      getSequence: jest.fn().mockReturnValue(mockSequence),
      getSequenceSegments: jest.fn().mockReturnValue(mockSegments),
      getSegment: jest.fn().mockReturnValue(mockSegments[0]),
    } as unknown as jest.Mocked<DataModelManager>;

    // Mock Webview
    mockWebview = {
      asWebviewUri: jest.fn().mockImplementation((uri) => uri),
      onDidReceiveMessage: jest.fn(),
      postMessage: jest.fn().mockResolvedValue(true),
      html: "",
      options: {},
      cspSource: "test-csp",
    };

    // Mock WebviewView
    mockWebviewView = {
      webview: mockWebview,
      viewType: ChatWebViewProvider.viewType,
      show: jest.fn(),
    } as unknown as vscode.WebviewView;

    // Mock VSCode window
    (vscode.window.activeTextEditor as any) = {
      viewColumn: vscode.ViewColumn.One,
      revealRange: jest.fn(),
    };

    // Mock VSCode commands
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(
      mockWebviewView
    );

    // Create provider instance
    provider = new ChatWebViewProvider(mockExtensionUri, mockDataModel);
  });

  describe("Initialization", () => {
    it("should be created with correct view type", () => {
      expect(ChatWebViewProvider.viewType).toBe("browsechat.chatView");
    });

    it("should resolve webview view with correct options", () => {
      provider.resolveWebviewView(
        mockWebviewView,
        {} as vscode.WebviewViewResolveContext,
        {} as vscode.CancellationToken
      );

      expect(mockWebviewView.webview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [mockExtensionUri],
      });
    });
  });

  describe("Message Handling", () => {
    beforeEach(() => {
      provider.resolveWebviewView(
        mockWebviewView,
        {} as vscode.WebviewViewResolveContext,
        {} as vscode.CancellationToken
      );
    });

    it("should handle loadSequence message", async () => {
      const onMessage = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];
      await onMessage({ type: "loadSequence", sequenceId: "sequence1" });

      expect(mockDataModel.getSequence).toHaveBeenCalledWith("sequence1");
      expect(mockDataModel.getSequenceSegments).toHaveBeenCalledWith(
        "sequence1"
      );
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: "sequenceLoaded",
        sequence: expect.objectContaining({
          id: "sequence1",
          sourceFile: "test.log",
          segments: expect.arrayContaining([
            expect.objectContaining({
              id: "segment1",
              content: "Test content 1",
            }),
          ]),
        }),
      });
    });

    it("should handle jumpToSegment message", async () => {
      const onMessage = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];
      await onMessage({ type: "jumpToSegment", segmentId: "segment1" });

      expect(mockDataModel.getSegment).toHaveBeenCalledWith("segment1");
      expect(vscode.window.activeTextEditor?.revealRange).toHaveBeenCalled();
    });

    it("should handle themeChanged message", async () => {
      const onMessage = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];
      await onMessage({ type: "themeChanged", theme: "dark" });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: "themeUpdated",
        colors: expect.any(Object),
      });
    });
  });

  describe("File Operations", () => {
    it("should open file and load sequence", async () => {
      const mockUri = { fsPath: "test.log" } as vscode.Uri;
      await provider.openFile(mockUri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.createWebviewView",
        ChatWebViewProvider.viewType,
        expect.any(Object)
      );
      expect(mockDataModel.getSequence).toHaveBeenCalledWith("test.log");
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: "sequenceLoaded",
        sequence: expect.any(Object),
      });
    });
  });

  describe("HTML Generation", () => {
    it("should generate valid HTML with security headers", () => {
      provider.resolveWebviewView(
        mockWebviewView,
        {} as vscode.WebviewViewResolveContext,
        {} as vscode.CancellationToken
      );

      expect(mockWebview.html).toContain("Content-Security-Policy");
      expect(mockWebview.html).toContain("test-nonce");
      expect(mockWebview.html).toContain("Chat Browser");
    });
  });

  describe("Theme Management", () => {
    it("should update theme colors", async () => {
      provider.resolveWebviewView(
        mockWebviewView,
        {} as vscode.WebviewViewResolveContext,
        {} as vscode.CancellationToken
      );

      const onMessage = (mockWebview.onDidReceiveMessage as jest.Mock).mock
        .calls[0][0];
      await onMessage({ type: "themeChanged", theme: "dark" });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: "themeUpdated",
        colors: expect.objectContaining({
          background: expect.any(vscode.ThemeColor),
          foreground: expect.any(vscode.ThemeColor),
        }),
      });
    });
  });

  describe("displayChat", () => {
    it("should update webview HTML with chat content", async () => {
      const mockSegment: ChatSegment = {
        id: "123",
        sequenceId: "seq1",
        content: "Test chat content",
        startIndex: 0,
        endIndex: 10,
        timestamp: new Date(),
        metadata: {
          participants: ["User1", "User2"],
          keywords: ["test", "chat"],
          length: 10,
          merge: function (other: ChatMetadata): ChatMetadata {
            throw new Error("Function not implemented.");
          },
        },
      };

      const mockSegment2: ChatSegment = {
        id: "456",
        sequenceId: "seq1",
        content: "Another test content",
        startIndex: 11,
        endIndex: 20,
        timestamp: new Date(),
        metadata: {
          participants: ["User2", "User3"],
          keywords: ["another", "test"],
          length: 10,
          merge: function (other: ChatMetadata): ChatMetadata {
            throw new Error("Function not implemented.");
          },
        },
      };

      await provider.displayChat([mockSegment, mockSegment2]);
      expect(mockWebview.html).toBeDefined();
    });
  });
});

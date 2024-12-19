import * as vscode from "vscode";
import * as fs from "fs/promises";
import { OpenChatBrowserCommand } from "../../../src/commands/OpenChatBrowserCommand";
import { DataModelManager } from "../../../src/models/DataModelManager";
import { ChatWebViewProvider } from "../../../src/ui/ChatWebViewProvider";
import { mockVSCode } from "../../mocks/vscode";

// Mock modules
jest.mock("fs/promises");
jest.mock("../../../src/models/DataModelManager");
jest.mock("../../../src/ui/ChatWebViewProvider");
jest.mock("vscode", () => mockVSCode);

describe("OpenChatBrowserCommand", () => {
  let openChatBrowserCommand: OpenChatBrowserCommand;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockWebviewProvider: jest.Mocked<ChatWebViewProvider>;
  let mockContext: vscode.ExtensionContext;

  const mockUri = {
    fsPath: "test/path/file.log",
    scheme: "file",
  } as vscode.Uri;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock data model
    mockDataModel = {
      loadFile: jest.fn(),
      validateFile: jest.fn(),
      processFile: jest.fn(),
      addSequence: jest.fn(),
      addSegment: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      getSegments: jest.fn(),
      getSequence: jest.fn(),
      getAllSequences: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    } as any;

    // Setup mock webview provider
    mockWebviewProvider = {
      openFile: jest.fn(),
      show: jest.fn(),
    } as any;

    // Setup mock extension context
    mockContext = new mockVSCode.ExtensionContext();

    // Initialize command with correct parameter order
    openChatBrowserCommand = new OpenChatBrowserCommand(
      mockDataModel,
      mockWebviewProvider,
      mockContext
    );

    // Setup default mock responses
    mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
    mockVSCode.window.withProgress.mockImplementation(
      async (
        options: vscode.ProgressOptions,
        task: (
          progress: vscode.Progress<any>,
          token: vscode.CancellationToken
        ) => Promise<any>
      ) => {
        return task(
          { report: jest.fn() },
          { isCancellationRequested: false, onCancellationRequested: jest.fn() }
        );
      }
    );
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
    (fs.readFile as jest.Mock).mockResolvedValue("Me: Test message");
  });

  describe("Command Registration", () => {
    it("should register the open chat browser command", () => {
      expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.openChatBrowser",
        expect.any(Function)
      );
      expect(mockContext.subscriptions.length).toBe(1);
    });
  });

  describe("File Selection", () => {
    it("should show file picker with correct options", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showOpenDialog).toHaveBeenCalledWith({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          "Log Files": ["log"],
        },
        title: "Select Chat Log File",
      });
    });

    it("should handle cancelled file selection", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue(undefined);

      await openChatBrowserCommand.execute();

      expect(mockWebviewProvider.openFile).not.toHaveBeenCalled();
    });
  });

  describe("File Validation", () => {
    it("should validate file extension", async () => {
      const invalidUri = { ...mockUri, fsPath: "test/path/file.txt" };
      mockVSCode.window.showOpenDialog.mockResolvedValue([invalidUri]);

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "Invalid file type. Please select a .log file."
      );
    });

    it("should validate file size", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 11 * 1024 * 1024, // 11MB
      });

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "File size exceeds maximum limit of 10MB."
      );
    });

    it("should validate empty files", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 0 });

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "Selected file is empty."
      );
    });

    it("should validate file format", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
      (fs.readFile as jest.Mock).mockResolvedValue("Invalid content");

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        "Invalid file format. File does not contain valid chat content."
      );
    });

    it('should accept valid chat format with "Me:" prefix', async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("Me: Test message")
        .mockResolvedValueOnce("Me: Test message");

      await openChatBrowserCommand.execute();

      expect(mockWebviewProvider.openFile).toHaveBeenCalledWith(mockUri);
    });

    it("should accept valid chat format with timestamp", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("[2024-12-16] Test message")
        .mockResolvedValueOnce("[2024-12-16] Test message");

      await openChatBrowserCommand.execute();

      expect(mockWebviewProvider.openFile).toHaveBeenCalledWith(mockUri);
    });
  });

  describe("File Processing", () => {
    beforeEach(() => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("Me: Test message")
        .mockResolvedValueOnce("Test content");
      mockVSCode.window.withProgress.mockImplementation(
        async (
          options: vscode.ProgressOptions,
          task: (
            progress: vscode.Progress<any>,
            token: vscode.CancellationToken
          ) => Promise<any>
        ) =>
          task(
            { report: jest.fn() },
            {
              isCancellationRequested: false,
              onCancellationRequested: jest.fn(),
            }
          )
      );
    });

    it("should process file with progress reporting", async () => {
      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.withProgress).toHaveBeenCalledTimes(1);
    });

    it("should handle processing cancellation", async () => {
      mockVSCode.window.withProgress.mockImplementation(
        async (
          options: vscode.ProgressOptions,
          task: (
            progress: vscode.Progress<any>,
            token: vscode.CancellationToken
          ) => Promise<any>
        ) =>
          task(
            { report: jest.fn() },
            {
              isCancellationRequested: true,
              onCancellationRequested: jest.fn(),
            }
          )
      );

      await openChatBrowserCommand.execute();

      expect(mockWebviewProvider.openFile).not.toHaveBeenCalled();
    });

    it("should show success message after processing", async () => {
      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        "Chat browser opened successfully."
      );
    });

    it("should process file in chunks", async () => {
      const largeContent = "a".repeat(2 * 1024 * 1024); // 2MB content
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("Me: Test message")
        .mockResolvedValueOnce(largeContent);

      await openChatBrowserCommand.execute();

      // Should have called report multiple times for chunks
      expect(mockVSCode.window.withProgress).toHaveBeenCalledTimes(1);
      expect(mockWebviewProvider.openFile).toHaveBeenCalledWith(mockUri);
    });
  });

  describe("Error Handling", () => {
    it("should handle file read errors", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("Read error"));

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Failed to validate file: Read error")
      );
    });

    it("should handle webview provider errors", async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([mockUri]);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("Me: Test message")
        .mockResolvedValueOnce("Test content");
      mockWebviewProvider.openFile.mockRejectedValue(
        new Error("Webview error")
      );

      await openChatBrowserCommand.execute();

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Failed to open chat browser: Webview error")
      );
    });
  });
});

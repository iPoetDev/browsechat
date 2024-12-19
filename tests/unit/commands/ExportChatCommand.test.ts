import * as vscode from "vscode";
import * as fs from "fs/promises";
import { ExportChatCommand } from "../../../src/commands/ExportChatCommand";
import { DataModelManager } from "../../../src/models/DataModelManager";
import {
  ChatSegment,
  ChatSequence,
  ChatMetadata,
} from "../../../src/models/types";

// Mock VSCode APIs
jest.mock("vscode");
jest.mock("fs/promises");

describe("ExportChatCommand", () => {
  let exportCommand: ExportChatCommand;
  let mockContext: vscode.ExtensionContext;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockQuickPick: jest.Mock;
  let mockSaveDialog: jest.Mock;
  let mockProgress: jest.Mock;

  const mockSegment1: ChatSegment = {
    id: "segment1",
    sequenceId: "seq1",
    content: "Test content 1\nSecond line",
    startIndex: 0,
    endIndex: 27,
    timestamp: new Date("2024-01-01T12:00:00Z"),
    metadata: {
      participants: ["User", "Assistant"],
      keywords: ["test"],
      timestamp: "2024-01-01T12:00:00Z",
      length: 27,
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
  };

  const mockSegment2: ChatSegment = {
    id: "segment2",
    sequenceId: "seq1",
    content: "Test content 2",
    startIndex: 27,
    endIndex: 40,
    timestamp: new Date("2024-01-01T12:01:00Z"),
    metadata: {
      participants: ["User", "Assistant"],
      keywords: ["test"],
      timestamp: "2024-01-01T12:01:00Z",
      length: 13,
      merge: function (other: ChatMetadata): ChatMetadata {
        throw new Error("Function not implemented.");
      },
    },
  };

  const mockSequence: ChatSequence = {
    id: "seq1",
    sourceFile: "test.log",
    segments: [mockSegment1, mockSegment2],
    totalSegments: 2,
    metadata: {
      participants: ["User", "Assistant"],
      keywords: ["test"],
      length: 40,
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock VSCode window functions
    mockQuickPick = jest.fn();
    mockSaveDialog = jest.fn();
    mockProgress = jest.fn().mockImplementation((options, task) => task());

    (vscode.window.showQuickPick as jest.Mock) = mockQuickPick;
    (vscode.window.showSaveDialog as jest.Mock) = mockSaveDialog;
    (vscode.window.withProgress as jest.Mock) = mockProgress;
    (vscode.window.showInformationMessage as jest.Mock) = jest.fn();
    (vscode.window.showErrorMessage as jest.Mock) = jest.fn();

    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionUri: {} as vscode.Uri,
    } as unknown as vscode.ExtensionContext;

    // Mock DataModelManager
    mockDataModel = {
      getAllSequences: jest.fn().mockReturnValue([mockSequence]),
      getSequenceSegments: jest
        .fn()
        .mockReturnValue([mockSegment1, mockSegment2]),
      getSequence: jest.fn().mockReturnValue(mockSequence),
    } as unknown as jest.Mocked<DataModelManager>;

    // Create ExportChatCommand instance
    exportCommand = new ExportChatCommand(mockDataModel, mockContext);
  });

  describe("Command Registration", () => {
    it("should register export command", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "browsechat.exportChat",
        expect.any(Function)
      );
    });
  });

  describe("Segment Selection", () => {
    it("should allow selecting multiple segments", async () => {
      mockQuickPick.mockResolvedValueOnce([
        { label: expect.any(String), picked: true },
      ]);

      // @ts-ignore - private method
      const segments = await exportCommand.selectSegments();

      expect(segments).toHaveLength(1);
      expect(mockQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: expect.any(String),
            description: "test.log",
            detail: expect.any(String),
            picked: false,
          }),
        ]),
        expect.objectContaining({
          canPickMany: true,
          placeHolder: expect.any(String),
        })
      );
    });

    it("should return empty array if no segments selected", async () => {
      mockQuickPick.mockResolvedValueOnce(undefined);

      // @ts-ignore - private method
      const segments = await exportCommand.selectSegments();

      expect(segments).toHaveLength(0);
    });
  });

  describe("Export Options", () => {
    it("should allow selecting export format and options", async () => {
      // Mock format selection
      mockQuickPick
        .mockResolvedValueOnce({
          format: { id: "plaintext", extension: ".txt", name: "Plain Text" },
        })
        .mockResolvedValueOnce({ value: true });

      // @ts-ignore - private method
      const options = await exportCommand.selectExportOptions();

      expect(options).toEqual({
        format: expect.objectContaining({
          id: "plaintext",
          extension: ".txt",
          name: "Plain Text",
        }),
        includeMetadata: true,
        customTemplate: undefined,
      });
    });

    it("should return undefined if format not selected", async () => {
      mockQuickPick.mockResolvedValueOnce(undefined);

      // @ts-ignore - private method
      const options = await exportCommand.selectExportOptions();

      expect(options).toBeUndefined();
    });
  });

  describe("Export Formats", () => {
    const segments = [mockSegment1, mockSegment2];

    it("should format as plain text", () => {
      // @ts-ignore - private method
      const result = exportCommand.formatAsPlainText(segments, mockSequence);

      expect(result).toContain("Test content 1");
      expect(result).toContain("Test content 2");
      expect(result).toContain("User, Assistant");
    });

    it("should format as markdown", () => {
      // @ts-ignore - private method
      const result = exportCommand.formatAsMarkdown(segments, mockSequence);

      expect(result).toContain("# Chat Export - test.log");
      expect(result).toContain("```");
      expect(result).toContain("Test content 1");
      expect(result).toContain("Test content 2");
    });

    it("should format as HTML", () => {
      // @ts-ignore - private method
      const result = exportCommand.formatAsHtml(segments, mockSequence);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<title>Chat Export</title>");
      expect(result).toContain("Test content 1");
      expect(result).toContain("Test content 2");
      expect(result).toContain("User, Assistant");
    });

    it("should format as JSON", () => {
      // @ts-ignore - private method
      const result = exportCommand.formatAsJson(segments, mockSequence);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        source: "test.log",
        generated: expect.any(String),
        segments: expect.arrayContaining([
          expect.objectContaining({
            content: "Test content 1\nSecond line",
            participants: ["User", "Assistant"],
          }),
          expect.objectContaining({
            content: "Test content 2",
            participants: ["User", "Assistant"],
          }),
        ]),
      });
    });
  });

  describe("Export Process", () => {
    it("should export with progress", async () => {
      const outputPath = "/test/output.txt";
      mockSaveDialog.mockResolvedValueOnce({ fsPath: outputPath });
      mockQuickPick
        .mockResolvedValueOnce([{ label: expect.any(String), picked: true }])
        .mockResolvedValueOnce({
          format: {
            id: "plaintext",
            extension: ".txt",
            name: "Plain Text",
            formatter: jest.fn(),
          },
        })
        .mockResolvedValueOnce({ value: true });

      await exportCommand.execute();

      expect(fs.writeFile).toHaveBeenCalledWith(
        outputPath,
        expect.any(String),
        "utf-8"
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining("Successfully exported")
      );
    });

    it("should handle export cancellation", async () => {
      const token = { isCancellationRequested: true };
      mockProgress.mockImplementation((options, task) => task({}, token));

      const outputPath = "/test/output.txt";
      const options = {
        format: {
          id: "plaintext",
          extension: ".txt",
          name: "Plain Text",
          formatter: jest.fn(),
        },
        includeMetadata: true,
      };

      // @ts-ignore - private method
      await expect(
        exportCommand.export([mockSegment1], outputPath, options)
      ).rejects.toThrow("Export cancelled");
    });

    it("should handle file write errors", async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(
        new Error("Write failed")
      );

      const outputPath = "/test/output.txt";
      mockSaveDialog.mockResolvedValueOnce({ fsPath: outputPath });
      mockQuickPick
        .mockResolvedValueOnce([{ label: expect.any(String), picked: true }])
        .mockResolvedValueOnce({
          format: {
            id: "plaintext",
            extension: ".txt",
            name: "Plain Text",
            formatter: jest.fn(),
          },
        })
        .mockResolvedValueOnce({ value: true });

      await exportCommand.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Write failed")
      );
    });
  });

  describe("Export Error Handling", () => {
    const outputPath = "/test/output.txt";
    const mockFormatter = jest.fn().mockReturnValue("formatted content");
    const options = {
      format: {
        id: "test",
        name: "Test Format",
        extension: ".txt",
        formatter: mockFormatter,
      },
      includeMetadata: true,
    };

    beforeEach(() => {
      mockSaveDialog = vscode.window.showSaveDialog as jest.Mock;
      mockQuickPick = vscode.window.showQuickPick as jest.Mock;
    });

    it("should handle cancellation", async () => {
      mockSaveDialog.mockResolvedValueOnce(undefined);
      mockQuickPick.mockResolvedValueOnce({ id: "plain" });

      await expect(exportCommand.execute()).resolves.toBeUndefined();
    });

    it("should handle file write errors", async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(
        new Error("Write failed")
      );

      const outputPath = "/test/output.txt";
      mockSaveDialog.mockResolvedValueOnce({ fsPath: outputPath });
      mockQuickPick.mockResolvedValueOnce({ id: "plain" });

      // @ts-ignore - private method
      await expect(
        exportCommand.export([mockSegment1], outputPath, options)
      ).rejects.toThrow("Write failed");
    });
  });
});

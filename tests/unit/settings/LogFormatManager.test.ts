import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as iconv from "iconv-lite";
import { EventEmitter } from "events";
import { LogFormatManager } from "../../../src/settings/LogFormatManager";

jest.mock("vscode");
jest.mock("fs/promises");
jest.mock("iconv-lite");

describe("LogFormatManager", () => {
  let manager: LogFormatManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
  let mockFileHandle: jest.Mocked<fs.FileHandle>;

  beforeEach(() => {
    // Mock VSCode workspace configuration
    mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn(),
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig
    );

    // Mock file system operations
    mockFileHandle = {
      read: jest.fn(),
      close: jest.fn(),
    } as any;

    (fs.open as jest.Mock).mockResolvedValue(mockFileHandle);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from("test content"));

    // Mock iconv-lite
    (iconv.decode as jest.Mock).mockReturnValue("decoded content");

    // Mock extension context
    mockContext = {
      subscriptions: [],
    } as any;

    // Create manager instance
    manager = new LogFormatManager(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        "browsechat.logs.format"
      );
      expect(mockConfig.get).toHaveBeenCalledWith(
        "fileTypes",
        expect.any(Array)
      );
      expect(mockConfig.get).toHaveBeenCalledWith("encoding", "utf8");
    });

    it("should register configuration change listener", () => {
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });
  });

  describe("file type validation", () => {
    it("should validate file type extensions", () => {
      const types = [
        { extension: ".log", isDefault: true },
        { extension: "txt" }, // Invalid
        { extension: ".log" }, // Duplicate
      ];

      const validTypes = (manager as any).validateFileTypes(types);
      expect(validTypes).toHaveLength(1);
      expect(validTypes[0].extension).toBe(".log");
    });

    it("should ensure at least one default type", () => {
      const types = [{ extension: ".log" }, { extension: ".txt" }];

      const validTypes = (manager as any).validateFileTypes(types);
      expect(validTypes.some((t: { isDefault: any }) => t.isDefault)).toBe(
        true
      );
    });
  });

  describe("file validation", () => {
    beforeEach(() => {
      (manager as any).fileTypes = [
        { extension: ".log", isDefault: true },
        { extension: ".txt" },
      ];
    });

    it("should validate file extension", async () => {
      const result = await manager.validateFile("test.invalid");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported file extension");
    });

    it("should detect file encoding from BOM", async () => {
      const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
      mockFileHandle.read.mockResolvedValue({
        bytesRead: utf8Bom.length,
        buffer: utf8Bom,
      });

      const result = await manager.validateFile("test.log");
      expect(result.detectedEncoding).toBe("utf8");
    });

    it("should validate content structure", async () => {
      const validContent = "[2024-01-01] User: Hello\nSystem: Hi";
      (iconv.decode as jest.Mock).mockReturnValue(validContent);

      const result = await manager.validateFile("test.log");
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should handle file read errors", async () => {
      (fs.open as jest.Mock).mockRejectedValue(new Error("Access denied"));

      const result = await manager.validateFile("test.log");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Access denied");
    });
  });

  describe("content structure validation", () => {
    it("should detect conversation markers", () => {
      const content = "[Message] Some content";
      const result = (manager as any).validateContentStructure(content);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should detect timestamps", () => {
      const content = "2024-01-01 Some content";
      const result = (manager as any).validateContentStructure(content);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should detect participant markers", () => {
      const content = "User: Hello\nSystem: Hi";
      const result = (manager as any).validateContentStructure(content);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should combine confidence scores", () => {
      const content = "[2024-01-01] User: Hello";
      const result = (manager as any).validateContentStructure(content);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("encoding management", () => {
    it("should validate supported encodings", () => {
      expect((manager as any).isSupportedEncoding("utf8")).toBe(true);
      expect((manager as any).isSupportedEncoding("utf16")).toBe(true);
      expect((manager as any).isSupportedEncoding("invalid")).toBe(false);
    });

    it("should update encoding setting", async () => {
      await manager.updateEncoding("utf16le");
      expect(mockConfig.update).toHaveBeenCalledWith(
        "encoding",
        "utf16le",
        true
      );
    });

    it("should reject invalid encodings", async () => {
      await expect(manager.updateEncoding("invalid")).rejects.toThrow(
        "Unsupported encoding"
      );
    });

    it("should handle encoding alternatives", () => {
      expect((manager as any).isSupportedEncoding("utf16")).toBe(true);
      expect((manager as any).isSupportedEncoding("ansi")).toBe(true);
    });
  });

  describe("file type management", () => {
    it("should get supported extensions", () => {
      (manager as any).fileTypes = [
        { extension: ".log" },
        { extension: ".txt" },
      ];
      expect(manager.getSupportedExtensions()).toEqual([".log", ".txt"]);
    });

    it("should get default extension", () => {
      (manager as any).fileTypes = [
        { extension: ".log", isDefault: true },
        { extension: ".txt" },
      ];
      expect(manager.getDefaultExtension()).toBe(".log");
    });

    it("should update file types", async () => {
      const newTypes = [{ extension: ".log", isDefault: true }];
      await manager.updateFileTypes(newTypes);
      expect(mockConfig.update).toHaveBeenCalledWith(
        "fileTypes",
        newTypes,
        true
      );
    });
  });

  describe("error handling", () => {
    it("should emit error events", () => {
      const errorSpy = jest.spyOn(manager, "emit");
      (manager as any).notifyError("test", "error message");
      expect(errorSpy).toHaveBeenCalledWith("error", "test", "error message");
    });

    it("should show error messages", () => {
      (manager as any).notifyError("test", "error message");
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should dispose all disposables", () => {
      const disposeSpy = jest.fn();
      (manager as any).disposables = [{ dispose: disposeSpy }];

      manager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe("file operations", () => {
    it("should read file headers", async () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf]);
      mockFileHandle.read.mockResolvedValue({
        bytesRead: buffer.length,
        buffer,
      });

      const header = await (manager as any).readFileHeader("test.log");
      expect(header).toEqual(buffer);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it("should read file content", async () => {
      const content = await (manager as any).readFileContent(
        "test.log",
        "utf8"
      );
      expect(fs.readFile).toHaveBeenCalled();
      expect(iconv.decode).toHaveBeenCalled();
      expect(content).toBe("decoded content");
    });

    it("should extract file extensions", () => {
      expect((manager as any).getFileExtension("test.log")).toBe(".log");
      expect((manager as any).getFileExtension("test")).toBe("");
      expect((manager as any).getFileExtension("test.LOG")).toBe(".log");
    });
  });
});

import * as vscode from "vscode";
import * as path from "path";
import { EventEmitter } from "events";
import { LogLocationManager } from "../../../src/settings/LogLocationManager";
import { mockVSCode } from "../../mocks/vscode";
import {
  MockFileSystemWatcher,
  mockEventFS,
  createMockStats,
} from "../../mocks/events";

jest.mock("vscode", () => mockVSCode);
jest.mock("fs/promises", () => mockEventFS.promises);

describe("LogLocationManager", () => {
  let manager: LogLocationManager;
  let mockContext: vscode.ExtensionContext;
  let configurationChangeCallback: (e: vscode.ConfigurationChangeEvent) => void;
  let mockWatcher: MockFileSystemWatcher;
  let mockConfig: { [key: string]: any };

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = new mockVSCode.ExtensionContext();
    mockConfig = {};

    // Mock workspace configuration
    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(() => ({
      get: (key: string) => mockConfig[key] || [],
      update: (key: string, value: any) => {
        mockConfig[key] = value;
        return Promise.resolve();
      },
    }));

    // Mock workspace folders
    (vscode.workspace.workspaceFolders as any) = [
      {
        uri: { fsPath: "/workspace" },
        name: "workspace",
        index: 0,
      },
    ];

    // Mock file system watcher
    mockWatcher = new MockFileSystemWatcher();
    (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(
      mockWatcher
    );

    // Mock configuration change event handler
    (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockImplementation(
      (callback) => {
        configurationChangeCallback = callback;
        return { dispose: jest.fn() };
      }
    );

    // Create manager instance
    manager = new LogLocationManager(mockContext);
  });

  describe("initialization", () => {
    it("should initialize with empty configuration", async () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        "browsechat.logs"
      );
      expect(manager.getValidDirectories()).toEqual([]);
    });

    it("should load initial configuration", async () => {
      mockConfig["directories"] = ["/test/path"];
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );

      manager = new LogLocationManager(mockContext);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(manager.getValidDirectories()).toContain("/test/path");
    });
  });

  describe("addDirectory", () => {
    it("should add valid directory", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const success = await manager.addDirectory("/test/path");

      expect(success).toBe(true);
      expect(manager.getValidDirectories()).toContain("/test/path");
      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    it("should handle workspace variables", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const success = await manager.addDirectory("${workspaceFolder}/logs");

      expect(success).toBe(true);
      expect(manager.getValidDirectories()).toContain("/workspace/logs");
    });

    it("should handle environment variables", async () => {
      process.env.TEST_PATH = "/env/path";
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const success = await manager.addDirectory("%TEST_PATH%/logs");

      expect(success).toBe(true);
      expect(manager.getValidDirectories()).toContain("/env/path/logs");
    });

    it("should handle relative paths", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const success = await manager.addDirectory("logs");

      expect(success).toBe(true);
      expect(manager.getValidDirectories()).toContain("/workspace/logs");
    });

    it("should reject invalid paths", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => false })
      );
      const success = await manager.addDirectory("/invalid/path");

      expect(success).toBe(false);
      expect(manager.getValidDirectories()).not.toContain("/invalid/path");
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it("should reject non-directory paths", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => false })
      );
      const success = await manager.addDirectory("/test/file.txt");

      expect(success).toBe(false);
      expect(manager.getValidDirectories()).not.toContain("/test/file.txt");
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("path validation", () => {
    it("should validate existing directories", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const success = await manager.addDirectory("/test/path");

      expect(success).toBe(true);
      expect(manager.getValidDirectories()).toContain("/test/path");
    });

    it("should handle permission errors", async () => {
      mockEventFS.promises.stat.mockImplementation(async () => {
        throw new Error("EACCES: Permission denied");
      });
      const success = await manager.addDirectory("/protected/path");

      expect(success).toBe(false);
      expect(manager.getValidDirectories()).not.toContain("/protected/path");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("Permission denied")
      );
    });

    it("should handle missing directories", async () => {
      mockEventFS.promises.stat.mockImplementation(async () => {
        throw new Error("ENOENT: No such file or directory");
      });
      const success = await manager.addDirectory("/missing/path");

      expect(success).toBe(false);
      expect(manager.getValidDirectories()).not.toContain("/missing/path");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining("does not exist")
      );
    });
  });

  describe("file watching", () => {
    it("should create watcher for valid directories", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      await manager.addDirectory("/test/path");

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
        expect.any(vscode.RelativePattern)
      );
    });

    it("should emit events on file changes", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      const createSpy = jest.fn();
      const changeSpy = jest.fn();
      const deleteSpy = jest.fn();

      manager.on("fileCreated", createSpy);
      manager.on("fileChanged", changeSpy);
      manager.on("fileDeleted", deleteSpy);

      await manager.addDirectory("/test/path");

      const fileUri = { fsPath: "/test/path/test.log" };
      mockWatcher.triggerCreate(fileUri);
      mockWatcher.triggerChange(fileUri);
      mockWatcher.triggerDelete(fileUri);

      expect(createSpy).toHaveBeenCalledWith("/test/path/test.log");
      expect(changeSpy).toHaveBeenCalledWith("/test/path/test.log");
      expect(deleteSpy).toHaveBeenCalledWith("/test/path/test.log");
    });
  });

  describe("configuration management", () => {
    it("should update configuration", async () => {
      await manager.updateConfiguration(["/test/path1", "/test/path2"]);
      expect(mockConfig["directories"]).toEqual(["/test/path1", "/test/path2"]);
    });

    it("should handle configuration changes", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );

      mockConfig["directories"] = ["/test/path1"];
      manager = new LogLocationManager(mockContext);
      await new Promise((resolve) => setTimeout(resolve, 0));

      mockConfig["directories"] = ["/test/path1", "/test/path2"];
      configurationChangeCallback({
        affectsConfiguration: (section: string) =>
          section === "browsechat.logs",
      } as vscode.ConfigurationChangeEvent);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(manager.getValidDirectories()).toContain("/test/path1");
      expect(manager.getValidDirectories()).toContain("/test/path2");
    });
  });

  describe("cleanup", () => {
    it("should dispose watchers and clear directories", async () => {
      mockEventFS.promises.stat.mockImplementation(async () =>
        createMockStats({ isDirectory: () => true })
      );
      await manager.addDirectory("/test/path");

      manager.dispose();

      expect(mockWatcher.dispose).toHaveBeenCalled();
      expect(manager.getValidDirectories()).toEqual([]);
    });
  });
});

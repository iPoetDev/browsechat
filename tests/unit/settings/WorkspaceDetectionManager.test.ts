/* eslint-disable curly */
import * as vscode from "vscode";
import * as path from "path";
import { EventEmitter } from "events";
import {
  SearchProgress,
  WorkspaceDetectionManager,
  DetectionMode,
} from "../../../src/settings/WorkspaceDetectionManager";

jest.mock("vscode");
jest.mock("minimatch");

describe("WorkspaceDetectionManager", () => {
  let manager: WorkspaceDetectionManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
  let mockFilesConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
  let mockWorkspace: jest.Mocked<typeof vscode.workspace>;
  let mockFileSystemWatcher: jest.Mocked<vscode.FileSystemWatcher>;

  beforeEach(() => {
    // Mock VSCode workspace configuration
    mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn(),
    } as any;

    mockFilesConfig = {
      get: jest.fn().mockReturnValue({}),
      update: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn(),
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockImplementation(
      (section: string) => {
        if (section === "files") {
          return mockFilesConfig;
        }
        return mockConfig;
      }
    );

    // Mock file system watcher
    mockFileSystemWatcher = {
      onDidCreate: jest.fn().mockReturnThis(),
      onDidDelete: jest.fn().mockReturnThis(),
      onDidChange: jest.fn().mockReturnThis(),
      dispose: jest.fn(),
    } as any;

    (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(
      mockFileSystemWatcher
    );

    // Mock workspace folders
    Object.defineProperty(vscode.workspace, "workspaceFolders", {
      value: [
        {
          uri: vscode.Uri.file("/test/workspace"),
          name: "test",
          index: 0,
        },
      ],
      configurable: true,
    });

    // Mock file system operations
    Object.defineProperty(vscode.workspace, "fs", {
      value: {
        readDirectory: jest.fn(),
        stat: jest.fn(),
        createDirectory: jest.fn(),
        delete: jest.fn(),
        rename: jest.fn(),
      },
      configurable: true,
    });

    // Mock extension context
    mockContext = {
      subscriptions: [],
    } as any;

    // Create manager instance
    manager = new WorkspaceDetectionManager(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        "browsechat.detection"
      );
      expect(mockConfig.get).toHaveBeenCalledWith("mode", DetectionMode.Manual);
      expect(mockConfig.get).toHaveBeenCalledWith("maxDepth", 3);
      expect(mockConfig.get).toHaveBeenCalledWith(
        "exclusions",
        expect.any(Array)
      );
    });

    it("should register configuration change listener", () => {
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it("should merge VS Code file exclusions", () => {
      mockFilesConfig.get.mockReturnValue({
        "**/node_modules/**": true,
        "**/dist/**": false,
        "**/build/**": true,
      });

      (manager as any).loadConfiguration();

      const exclusions = manager.getExclusions();
      expect(exclusions).toContain("**/node_modules/**");
      expect(exclusions).toContain("**/build/**");
      expect(exclusions).not.toContain("**/dist/**");
    });
  });

  describe("detection mode management", () => {
    it("should update detection mode", async () => {
      await manager.setDetectionMode(DetectionMode.Auto);
      expect(mockConfig.update).toHaveBeenCalledWith(
        "mode",
        DetectionMode.Auto,
        true
      );
    });

    it("should start auto detection when mode changes to auto", async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "mode") return DetectionMode.Auto;
        return undefined;
      });

      const startAutoDetectionSpy = jest.spyOn(
        manager as any,
        "startAutoDetection"
      );
      await (manager as any).updateDetectionMode();

      expect(startAutoDetectionSpy).toHaveBeenCalled();
    });

    it("should dispose file watchers when mode changes", async () => {
      const disposeWatchersSpy = jest.spyOn(
        manager as any,
        "disposeFileWatchers"
      );
      await (manager as any).updateDetectionMode();
      expect(disposeWatchersSpy).toHaveBeenCalled();
    });
  });

  describe("workspace detection", () => {
    beforeEach(() => {
      (vscode.workspace.fs.readDirectory as jest.Mock).mockResolvedValue([
        ["file1.log", vscode.FileType.File],
        ["dir1", vscode.FileType.Directory],
        ["file2.txt", vscode.FileType.File],
      ]);
    });

    it("should detect files in workspace", async () => {
      const progress: SearchProgress = { processed: 0, total: 0, skipped:  [] };
      await (manager as any).detectInWorkspace("/test/path", 0, progress);

      expect(progress.processed).toBe(3);
      expect(progress.total).toBe(3);
      expect(progress.skipped).toHaveLength(0);
    });

    it("should respect max depth", async () => {
      const progress: SearchProgress = { processed: 0, total: 0, skipped:  [] };
      (manager as any).config.maxDepth = 0;

      await (manager as any).detectInWorkspace("/test/path/deep", 1, progress);

      expect(progress.skipped).toContain("/test/path/deep");
    });

    it("should handle directory read errors", async () => {
      (vscode.workspace.fs.readDirectory as jest.Mock).mockRejectedValue(
        new Error("Access denied")
      );
      const progress: SearchProgress = { processed: 0, total: 0, skipped:  [] };
      const errorSpy = jest.spyOn(manager, "emit");

      await (manager as any).detectInWorkspace("/test/error/path", 0, progress);

      expect(errorSpy).toHaveBeenCalledWith(
        "error",
        expect.any(String),
        expect.any(Error)
      );
      expect(progress.skipped).toContain("/test/error/path");
    });

    it("should setup file watchers for directories with log files", async () => {
      const progress: SearchProgress = { processed: 0, total: 0, skipped:  [] };
      await (manager as any).detectInWorkspace("/test/path", 0, progress);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
      expect(mockFileSystemWatcher.onDidCreate).toHaveBeenCalled();
      expect(mockFileSystemWatcher.onDidDelete).toHaveBeenCalled();
      expect(mockFileSystemWatcher.onDidChange).toHaveBeenCalled();
    });
  });

  describe("exclusion management", () => {
    it("should check path exclusions", () => {
      (manager as any).config.exclusions = ["**/node_modules/**", "**/test/**"];

      expect(
        (manager as any).isExcluded("/project/node_modules/file.log")
      ).toBe(true);
      expect((manager as any).isExcluded("/project/src/file.log")).toBe(false);
    });

    it("should update exclusions", async () => {
      const newExclusions = ["**/custom/**", "**/temp/**"];
      await manager.updateExclusions(newExclusions);

      expect(mockConfig.update).toHaveBeenCalledWith(
        "exclusions",
        newExclusions,
        true
      );
    });
  });

  describe("search progress", () => {
    it("should track search progress", async () => {
      const progressSpy = jest.spyOn(manager, "emit");
      const progress: SearchProgress = { processed: 0, total: 0, skipped:  [] };

      await (manager as any).detectInWorkspace("/test/path", 0, progress);

      expect(progressSpy).toHaveBeenCalledWith(
        "searchProgress",
        expect.objectContaining({
          processed: expect.any(Number),
          total: expect.any(Number),
        })
      );
    });

    it("should emit search complete", async () => {
      const completeSpy = jest.spyOn(manager, "emit");
      await (manager as any).startAutoDetection();

      expect(completeSpy).toHaveBeenCalledWith(
        "searchComplete",
        expect.any(Object)
      );
    });
  });

  describe("file watching", () => {
    it("should emit file events", () => {
      const fileFoundSpy = jest.spyOn(manager, "emit");
      (manager as any).setupFileWatcher("/test/path");

      const fileUri = vscode.Uri.file("/test/path/file.log");
      mockFileSystemWatcher.onDidCreate.mock.calls[0][0](fileUri);
      mockFileSystemWatcher.onDidDelete.mock.calls[0][0](fileUri);
      mockFileSystemWatcher.onDidChange.mock.calls[0][0](fileUri);

      expect(fileFoundSpy).toHaveBeenCalledWith(
        "fileFound",
        "/test/path/file.log"
      );
      expect(fileFoundSpy).toHaveBeenCalledWith(
        "fileRemoved",
        "/test/path/file.log"
      );
      expect(fileFoundSpy).toHaveBeenCalledWith(
        "fileChanged",
        "/test/path/file.log"
      );
    });
  });

  describe("cleanup", () => {
    it("should dispose all watchers and disposables", () => {
      const watcher = { dispose: jest.fn() };
      const disposable = { dispose: jest.fn() };

      (manager as any).fileWatchers = [watcher];
      (manager as any).disposables = [disposable];

      manager.dispose();

      expect(watcher.dispose).toHaveBeenCalled();
      expect(disposable.dispose).toHaveBeenCalled();
    });
  });

  describe("utility methods", () => {
    it("should get current mode", () => {
      (manager as any).config.mode = DetectionMode.Auto;
      expect(manager.getCurrentMode()).toBe(DetectionMode.Auto);
    });

    it("should get max depth", () => {
      (manager as any).config.maxDepth = 5;
      expect(manager.getMaxDepth()).toBe(5);
    });

    it("should get exclusions", () => {
      const exclusions = ["**/test/**", "**/temp/**"];
      (manager as any).config.exclusions = exclusions;
      expect(manager.getExclusions()).toEqual(exclusions);
      expect(manager.getExclusions()).not.toBe(exclusions); // Should be a copy
    });

    it("should check if search is in progress", () => {
      (manager as any).searchInprogress = true;
      expect(manager.isSearching()).toBe(true);
    });
  });
});

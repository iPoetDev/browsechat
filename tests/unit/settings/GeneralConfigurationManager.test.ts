import * as vscode from "vscode";
import { EventEmitter } from "events";
import {
  GeneralConfigurationManager,
  ThemeMode,
} from "../../../src/settings/GeneralConfigurationManager";

jest.mock("vscode");

describe("GeneralConfigurationManager", () => {
  let manager: GeneralConfigurationManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
  let mockGlobalState: jest.Mocked<vscode.Memento>;

  beforeEach(() => {
    // Mock VSCode configuration
    mockConfig = {
      get: jest.fn(),
      update: jest.fn(),
      has: jest.fn(),
      inspect: jest.fn(),
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig
    );

    // Mock VSCode extension context
    mockGlobalState = {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(),
    };

    mockContext = {
      globalState: mockGlobalState,
      subscriptions: [],
    } as any;

    // Create manager instance
    manager = new GeneralConfigurationManager(mockContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        "browsechat.general"
      );
      expect(mockGlobalState.get).toHaveBeenCalledWith("cacheSize", 0);
    });

    it("should register configuration change listener", () => {
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });
  });

  describe("configuration validation", () => {
    it("should validate maxFileSize", () => {
      const config = {
        maxFileSize: -1,
        autoOpen: true,
        theme: ThemeMode.Auto,
        caching: { enabled: true, maxSize: 1000, clearOnExit: true },
      };

      const results = (manager as any).validateConfiguration(config);
      expect(results).toContainEqual(
        expect.objectContaining({
          isValid: false,
          message: "Maximum file size must be positive",
        })
      );
    });

    it("should validate theme mode", () => {
      const config = {
        maxFileSize: 1000,
        autoOpen: true,
        theme: "invalid" as ThemeMode,
        caching: { enabled: true, maxSize: 1000, clearOnExit: true },
      };

      const results = (manager as any).validateConfiguration(config);
      expect(results).toContainEqual(
        expect.objectContaining({
          isValid: false,
          message: expect.stringContaining("Invalid theme mode"),
        })
      );
    });

    it("should validate cache configuration", () => {
      const config = {
        maxFileSize: 1000,
        autoOpen: true,
        theme: ThemeMode.Auto,
        caching: { enabled: true, maxSize: -1, clearOnExit: true },
      };

      const results = (manager as any).validateConfiguration(config);
      expect(results).toContainEqual(
        expect.objectContaining({
          isValid: false,
          message: "Cache size must be positive when caching is enabled",
        })
      );
    });
  });

  describe("configuration updates", () => {
    it("should update maxFileSize", async () => {
      const newSize = 1024 * 1024;
      await manager.setMaxFileSize(newSize);
      expect(mockConfig.update).toHaveBeenCalledWith(
        "maxFileSize",
        newSize,
        true
      );
    });

    it("should reject invalid maxFileSize", async () => {
      await expect(manager.setMaxFileSize(-1)).rejects.toThrow(
        "Maximum file size must be positive"
      );
    });

    it("should update autoOpen setting", async () => {
      await manager.setAutoOpen(false);
      expect(mockConfig.update).toHaveBeenCalledWith("autoOpen", false, true);
    });

    it("should update theme setting", async () => {
      await manager.setTheme(ThemeMode.Dark);
      expect(mockConfig.update).toHaveBeenCalledWith(
        "theme",
        ThemeMode.Dark,
        true
      );
    });

    it("should reject invalid theme", async () => {
      await expect(manager.setTheme("invalid" as ThemeMode)).rejects.toThrow(
        "Invalid theme mode"
      );
    });

    it("should update cache configuration", async () => {
      const newConfig = {
        enabled: false,
        maxSize: 2048,
        clearOnExit: false,
      };
      await manager.updateCacheConfig(newConfig);
      expect(mockConfig.update).toHaveBeenCalledWith(
        "caching.enabled",
        false,
        true
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "caching.maxSize",
        2048,
        true
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "caching.clearOnExit",
        false,
        true
      );
    });
  });

  describe("cache management", () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        const defaults = {
          "caching.enabled": true,
          "caching.maxSize": 1000,
          "caching.clearOnExit": true,
        };
        return defaults[key as keyof typeof defaults];
      });
    });

    it("should add to cache when within limits", async () => {
      mockGlobalState.get.mockReturnValue(0);
      const result = await manager.addToCache(500);
      expect(result).toBe(true);
      expect(mockGlobalState.update).toHaveBeenCalledWith("cacheSize", 500);
    });

    it("should reject cache addition when exceeding limits", async () => {
      mockGlobalState.get.mockReturnValue(800);
      const result = await manager.addToCache(300);
      expect(result).toBe(false);
    });

    it("should clear cache", async () => {
      await manager.clearCache();
      expect(mockGlobalState.update).toHaveBeenCalledWith("cacheSize", 0);
    });

    it("should get current cache size", () => {
      mockGlobalState.get.mockReturnValue(500);
      expect(manager.getCurrentCacheSize()).toBe(500);
    });
  });

  describe("event emission", () => {
    it("should emit themeChanged event", async () => {
      const listener = jest.fn();
      manager.on("themeChanged", listener);

      // Simulate configuration change
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "theme") {
          return ThemeMode.Dark;
        }
        return undefined;
      });
      await (manager as any).loadConfiguration();

      expect(listener).toHaveBeenCalledWith(ThemeMode.Dark);
    });

    it("should emit cachingChanged event", async () => {
      const listener = jest.fn();
      manager.on("cachingChanged", listener);

      // Simulate configuration change
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "caching.enabled") {
          return false;
        }
        return undefined;
      });
      await (manager as any).loadConfiguration();

      expect(listener).toHaveBeenCalledWith(false);
    });

    it("should emit cacheFull event", async () => {
      const listener = jest.fn();
      manager.on("cacheFull", listener);

      mockGlobalState.get.mockReturnValue(800);
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "caching.maxSize") {
          return 1000;
        }
        if (key === "caching.enabled") {
          return true;
        }
        return undefined;
      });

      await manager.addToCache(300);

      expect(listener).toHaveBeenCalledWith({
        current: 800,
        attempted: 300,
        maximum: 1000,
      });
    });

    it("should emit cacheCleared event", async () => {
      const listener = jest.fn();
      manager.on("cacheCleared", listener);

      await manager.clearCache();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should clear cache on dispose if clearOnExit is true", async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "caching.clearOnExit") {
          return true;
        }
        return undefined;
      });

      const clearCacheSpy = jest.spyOn(manager, "clearCache");
      manager.dispose();

      expect(clearCacheSpy).toHaveBeenCalled();
    });

    it("should not clear cache on dispose if clearOnExit is false", () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "caching.clearOnExit") {
          return false;
        }
        return undefined;
      });

      const clearCacheSpy = jest.spyOn(manager, "clearCache");
      manager.dispose();

      expect(clearCacheSpy).not.toHaveBeenCalled();
    });

    it("should dispose all disposables", () => {
      const disposeSpy = jest.fn();
      (manager as any).disposables = [{ dispose: disposeSpy }];

      manager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe("utility methods", () => {
    it("should return setting documentation", () => {
      const docs = manager.getSettingDocumentation();
      expect(docs).toHaveProperty("maxFileSize");
      expect(docs).toHaveProperty("autoOpen");
      expect(docs).toHaveProperty("theme");
      expect(docs).toHaveProperty("caching.enabled");
      expect(docs).toHaveProperty("caching.maxSize");
      expect(docs).toHaveProperty("caching.clearOnExit");
    });

    it("should return current theme", () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "theme") {
          return ThemeMode.Dark;
        }
        return undefined;
      });
      expect(manager.getCurrentTheme()).toBe(ThemeMode.Dark);
    });

    it("should return max file size", () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === "maxFileSize") {
          return 1024;
        }
        return undefined;
      });
      expect(manager.getMaxFileSize()).toBe(1024);
    });

    it("should return cache config", () => {
      const cacheConfig = {
        enabled: true,
        maxSize: 1024,
        clearOnExit: true,
      };
      mockConfig.get.mockImplementation((key: string) => {
        if (key.startsWith("caching.")) {
          const subKey = key.split(".")[1];
          return cacheConfig[subKey as keyof typeof cacheConfig];
        }
        return undefined;
      });
      expect(manager.getCacheConfig()).toEqual(cacheConfig);
    });
  });
});

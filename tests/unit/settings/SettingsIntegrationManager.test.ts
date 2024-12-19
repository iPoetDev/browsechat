import * as vscode from "vscode";
import { SettingsIntegrationManager } from "../../../src/settings/SettingsIntegrationManager";
import { LogFormatManager } from "../../../src/settings/LogFormatManager";
import { LogLocationManager } from "../../../src/settings/LogLocationManager";
import { WorkspaceDetectionManager } from "../../../src/settings/WorkspaceDetectionManager";
import { GeneralConfigurationManager } from "../../../src/settings/GeneralConfigurationManager";

jest.mock("vscode");
jest.mock("fs/promises");

describe("SettingsIntegrationManager", () => {
  let manager: SettingsIntegrationManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfig: jest.Mocked<vscode.WorkspaceConfiguration>;
  let mockFormatManager: jest.Mocked<LogFormatManager>;
  let mockLocationManager: jest.Mocked<LogLocationManager>;
  let mockDetectionManager: jest.Mocked<WorkspaceDetectionManager>;
  let mockGeneralManager: jest.Mocked<GeneralConfigurationManager>;

  beforeEach(() => {
    // Mock VSCode workspace configuration
    mockConfig = {
      get: jest.fn(),
      has: jest.fn(),
      update: jest.fn(),
      inspect: jest.fn(),
    } as any;

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig
    );

    // Mock extension context
    mockContext = {
      globalStorageUri: { fsPath: "/mock/storage/path" },
      subscriptions: [],
    } as any;

    // Mock manager dependencies
    mockFormatManager = {
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockLocationManager = {
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockDetectionManager = {
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockGeneralManager = {
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    manager = new SettingsIntegrationManager(mockContext, {
      format: mockFormatManager,
      location: mockLocationManager,
      detection: mockDetectionManager,
      general: mockGeneralManager,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default version", () => {
      expect(mockConfig.get).toHaveBeenCalledWith("version");
    });

    it("should register configuration change listener", () => {
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });
  });

  describe("settings validation", () => {
    it("should validate required settings", async () => {
      mockConfig.get.mockImplementation((key: string) => {
        const settings: { [key: string]: any } = {
          "logs.format.fileTypes": [".log"],
          "logs.format.encoding": "utf8",
          "general.maxFileSize": 1024,
        };
        return settings[key];
      });

      const validateSpy = jest.spyOn(manager as any, "validateSettings");
      await (manager as any).validateSettings();

      expect(validateSpy).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalledWith("logs.format.fileTypes");
      expect(mockConfig.get).toHaveBeenCalledWith("logs.format.encoding");
      expect(mockConfig.get).toHaveBeenCalledWith("general.maxFileSize");
    });

    it("should emit validation errors for missing required settings", async () => {
      mockConfig.get.mockReturnValue(undefined);
      const emitSpy = jest.spyOn(manager, "emit");

      await (manager as any).validateSettings();

      expect(emitSpy).toHaveBeenCalledWith(
        "validationErrors",
        expect.any(Array)
      );
    });
  });

  describe("settings changes", () => {
    it("should detect and handle configuration changes", async () => {
      const oldSnapshot = { "general.maxFileSize": 1024 };
      const newSnapshot = { "general.maxFileSize": 2048 };

      jest
        .spyOn(manager as any, "captureSettingsSnapshot")
        .mockResolvedValueOnce(newSnapshot);

      (manager as any).settingsSnapshot = oldSnapshot;

      const mockChangeEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true),
      };

      await (manager as any).handleConfigurationChange(mockChangeEvent);

      expect(manager["settingsSnapshot"]).toEqual(newSnapshot);
    });

    it("should validate setting changes", async () => {
      const diff = {
        setting: "general.maxFileSize",
        oldValue: 1024,
        newValue: -1,
        scope: vscode.ConfigurationTarget.Global,
      };

      const validateSpy = jest.spyOn(manager as any, "validateSettingChange");
      const emitSpy = jest.spyOn(manager, "emit");

      await (manager as any).validateSettingChange(diff);

      expect(validateSpy).toHaveBeenCalledWith(diff);
      expect(emitSpy).toHaveBeenCalledWith(
        "validationErrors",
        expect.any(Array)
      );
    });
  });

  describe("version management", () => {
    it("should handle first installation", async () => {
      mockConfig.get.mockReturnValue(undefined);
      const updateVersionSpy = jest.spyOn(manager as any, "updateVersion");

      await (manager as any).checkVersionMigration();

      expect(updateVersionSpy).toHaveBeenCalled();
    });

    it("should migrate settings when version changes", async () => {
      mockConfig.get.mockReturnValue("0.9.0");
      const migrateSpy = jest.spyOn(manager as any, "migrateSettings");
      const updateVersionSpy = jest.spyOn(manager as any, "updateVersion");

      await (manager as any).checkVersionMigration();

      expect(migrateSpy).toHaveBeenCalled();
      expect(updateVersionSpy).toHaveBeenCalled();
    });
  });

  describe("backup and reset", () => {
    it("should create settings backup", async () => {
      const mockSnapshot = { "general.maxFileSize": 1024 };
      jest
        .spyOn(manager as any, "captureSettingsSnapshot")
        .mockResolvedValue(mockSnapshot);

      const backupPath = await manager.createBackup();

      expect(backupPath).toBeTruthy();
    });

    it("should reset settings by scope", async () => {
      const resetScopeSpy = jest.spyOn(manager as any, "resetScope");

      await manager.resetSettings(vscode.ConfigurationTarget.Global);

      expect(resetScopeSpy).toHaveBeenCalledWith(
        vscode.ConfigurationTarget.Global
      );
      expect(resetScopeSpy).toHaveBeenCalledWith(
        vscode.ConfigurationTarget.Workspace
      );
    });
  });

  describe("conflict resolution", () => {
    it("should resolve setting conflicts", async () => {
      const diff = {
        setting: "detection.mode",
        oldValue: "manual",
        newValue: "auto",
        scope: vscode.ConfigurationTarget.Global,
      };

      mockConfig.get.mockReturnValue(["path1", "path2"]);

      await (manager as any).resolveConflicts(diff);

      expect(mockConfig.update).toHaveBeenCalledWith(
        "logs.locations",
        [],
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe("cleanup", () => {
    it("should dispose resources", () => {
      const disposeSpy = jest.fn();
      (manager as any).disposables = [{ dispose: disposeSpy }];

      manager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});

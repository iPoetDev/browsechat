import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { EventEmitter } from "events";
import { LogFormatManager } from "./LogFormatManager";
import { LogLocationManager } from "./LogLocationManager";
import { WorkspaceDetectionManager } from "./WorkspaceDetectionManager";
import { GeneralConfigurationManager } from "./GeneralConfigurationManager";


/**
 * SettingsDiff represents a change in a configuration setting.
 *
 * @interface SettingsDiff
 * @typedef {SettingsDiff}
 * 
 * @property {string} setting - The name of the configuration setting.
 * @property {any} oldValue - The old value of the setting.
 * @property {any} newValue - The new value of the setting.
 * @property {vscode.ConfigurationTarget} scope - The scope of the setting.
 */
interface SettingsDiff {
  setting: string;
  oldValue: any;
  newValue: any;
  scope: vscode.ConfigurationTarget;
}


/**
 * FormatValidationResult represents the validation result for a log file.
 *
 * @interface FormatValidationResult
 * @typedef {FormatValidationResult}
 * 
 * @property {boolean} isValid - Indicates whether the log file is valid based on the specified format
 * @property {string} message - A message describing the validation result.
 * @property {string} [format] - The format used to validate the log file.
 */
interface SettingsVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * SettingsBackup represents a backup of the settings.
 *
 * @interface SettingsBackup
 * @typedef {SettingsBackup}
 * 
 * @property {string} version - The version of the settings.
 * @property {string} timestamp - The timestamp of the backup.
 * @property {Object} settings - The settings object.
 */
interface SettingsBackup {
  version: string;
  timestamp: string;
  settings: { [key: string]: any };
}

/**
 * SettingsIntegrationManager is a class that manages the integration between the extension and VS Code settings.
 * It captures changes in the settings, validates them, and applies the changes to the extension's configuration.
 * It also handles version migration of the settings.
 * 
 * @class SettingsIntegrationManager
 * @extends {EventEmitter}
 * 
 * @property {vscode.ExtensionContext} context - The extension context.
 * @property {Object} managers - Managers for the different configuration sections.
 * @property {Array<vscode.Disposable>} disposables - An array of disposables for event listeners.
 * @property {Object} settingsSnapshot - A snapshot of the current settings.
 * 
 *  constructor: Initializes the manager with the extension context and other managers.
 *  initialize: Takes an initial snapshot of the settings, watches for configuration changes, validates the current settings, and checks for version migration.
 *  handleConfigurationChange: Handles changes to the settings by comparing the old and new snapshots, validating the changes, and resolving conflicts.
 *  captureSettingsSnapshot: Captures a snapshot of the current settings.
 *  compareSnapshots: Compares two snapshots and returns a list of changes.
 *  validateSettings: Validates the current settings and returns a list of errors.
 *  validateSettingChange: Validates a single setting change and returns a list of errors.
 *  resolveConflicts: Resolves conflicts between settings.
 *  checkVersionMigration: Checks if the current version is outdated and migrates the settings if necessary.
 *  parseVersion: Parses a version string into a SettingsVersion object.
 *  shouldMigrate: Checks if the current version is outdated.
 *  migrateSettings: Migrates the settings from an old version to the current version.
 *  updateVersion: Updates the version of the settings.
 *  createBackup: Creates a backup of the current settings.
 *  resetSettings: Resets the settings to their default values.
 *  getCurrentConfiguration: Returns the current configuration.
 *  update: Updates a setting.
 *  validate: Validates the settings.
 *  migrate: Migrates the settings from an old version to the current version.
 *  getGlobalConfiguration: Returns the global configuration.
 *  getConfiguration: Returns the configuration for a given scope.
 *  applyDefaults: Applies default values to the configuration.
 *  updateSetting: Updates a setting.
 *  getRequiredSettings: Returns a list of required settings.
 *  getSettingDependencies: Returns a list of setting dependencies.
 *  getDeprecatedSettings: Returns a list of deprecated settings.
 *  getSettingType: Returns the type of a setting.
 *  getSettingValidation: Returns a validation function for a setting.
 *  getSettingConflicts: Returns a list of conflicts for a setting.
 *  getVersionMigrations: Returns a list of version migrations.
 *  dispose: Disposes of the manager. 
 */
export class SettingsIntegrationManager extends EventEmitter {
  private static readonly CURRENT_VERSION: SettingsVersion = {
    major: 1,
    minor: 0,
    patch: 0,
  };

  
  /**
   * Managers for the different configuration sections.
   *
   * @private
   * @readonly
   * @type {{
   *     format: LogFormatManager;
   *     location: LogLocationManager;
   *     detection: WorkspaceDetectionManager;
   *     general: GeneralConfigurationManager;
   *   }}
   */
  private readonly managers: {
    format: LogFormatManager;
    location: LogLocationManager;
    detection: WorkspaceDetectionManager;
    general: GeneralConfigurationManager;
  };

  private disposables: vscode.Disposable[] = [];
  private settingsSnapshot: { [key: string]: any } = {};

  
  /**
   * Creates an instance of SettingsIntegrationManager.
   *
   * 
   * @param {vscode.ExtensionContext} context
   * @param {{
   *       format: LogFormatManager;
   *       location: LogLocationManager;
   *       detection: WorkspaceDetectionManager;
   *       general: GeneralConfigurationManager;
   *     }} managers
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    managers: {
      format: LogFormatManager;
      location: LogLocationManager;
      detection: WorkspaceDetectionManager;
      general: GeneralConfigurationManager;
    }
  ) {
    super();
    this.managers = managers;
    this.initialize();
  }

  
  /**
   * Initializes the manager.
   *
   * @private
   * 
   * @returns {*}
   */
  private async initialize() {
    // Take initial snapshot
    this.settingsSnapshot = await this.captureSettingsSnapshot();

    // Watch for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        this.handleConfigurationChange(e);
      })
    );

    // Validate current settings
    await this.validateSettings();

    // Check for version migration
    await this.checkVersionMigration();
  }

  
  /**
   * Handle a change in the configuration.
   *
   * @private
   * 
   * @param {vscode.ConfigurationChangeEvent} e
   * @returns {*}
   */
  private async handleConfigurationChange(e: vscode.ConfigurationChangeEvent) {
    const newSnapshot = await this.captureSettingsSnapshot();
    const diffs = this.compareSnapshots(this.settingsSnapshot, newSnapshot);

    for (const diff of diffs) {
      this.emit("settingChanged", diff);
      await this.validateSettingChange(diff);
      await this.resolveConflicts(diff);
    }

    this.settingsSnapshot = newSnapshot;
  }

  
  /**
   * Capture a snapshot of the current settings.
   *
   * @private
   * 
   * @returns {Promise<{ [key: string]: any }>}
   */
  private async captureSettingsSnapshot(): Promise<{ [key: string]: any }> {
    const snapshot: { [key: string]: any } = {};
    const config = vscode.workspace.getConfiguration("browsechat");

    // Recursively capture all settings
    const captureSection = (obj: any, prefix: string = "") => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === "object") {
          captureSection(value, fullKey);
        } else {
          snapshot[fullKey] = value;
        }
      }
    };

    captureSection(config);
    return snapshot;
  }

  
  /**
   * Compare two settings snapshots and return the differences.
   *
   * @private
   * @param {{ [key: string]: any }} old
   * @param {{ [key: string]: any }} new_
   * @returns {SettingsDiff[]}
   */
  private compareSnapshots(
    old: { [key: string]: any },
    new_: { [key: string]: any }
  ): SettingsDiff[] {
    const diffs: SettingsDiff[] = [];

    // Check for changed or removed settings
    for (const [key, oldValue] of Object.entries(old)) {
      if (!(key in new_)) {
        diffs.push({
          setting: key,
          oldValue,
          newValue: undefined,
          scope: vscode.ConfigurationTarget.Global,
        });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(new_[key])) {
        diffs.push({
          setting: key,
          oldValue,
          newValue: new_[key],
          scope: vscode.ConfigurationTarget.Global,
        });
      }
    }

    // Check for new settings
    for (const [key, newValue] of Object.entries(new_)) {
      if (!(key in old)) {
        diffs.push({
          setting: key,
          oldValue: undefined,
          newValue,
          scope: vscode.ConfigurationTarget.Global,
        });
      }
    }

    return diffs;
  }

  
  /**
   * Validate the current settings.
   *
   * @private
   * 
   * @returns {Promise<boolean>}
   */
  private async validateSettings(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("browsechat");
    const errors: string[] = [];

    // Check required settings
    const requiredSettings = this.getRequiredSettings();
    for (const setting of requiredSettings) {
      if (config.get(setting) === undefined) {
        errors.push(`Missing required setting: ${setting}`);
      }
    }

    // Check dependencies
    const dependencies = this.getSettingDependencies();
    for (const [setting, deps] of Object.entries(dependencies)) {
      if (config.get(setting) !== undefined) {
        for (const dep of deps) {
          if (config.get(dep) === undefined) {
            errors.push(`Setting ${setting} requires ${dep}`);
          }
        }
      }
    }

    // Check for deprecated settings
    const deprecated = this.getDeprecatedSettings();
    for (const [oldSetting, info] of Object.entries(deprecated)) {
      if (config.get(oldSetting) !== undefined) {
        this.emit("deprecatedSetting", { setting: oldSetting, ...info });
      }
    }

    if (errors.length > 0) {
      this.emit("validationErrors", errors);
      return false;
    }

    return true;
  }

  
  /**
   * Validate a single setting change.
   *
   * @private
   * 
   * @param {SettingsDiff} diff
   * @returns {Promise<boolean>}
   */
  private async validateSettingChange(diff: SettingsDiff): Promise<boolean> {
    const config = vscode.workspace.getConfiguration("browsechat");
    const errors: string[] = [];

    // Check value type
    const expectedType = this.getSettingType(diff.setting);
    if (expectedType && diff.newValue !== undefined) {
      if (typeof diff.newValue !== expectedType) {
        errors.push(
          `Invalid type for ${diff.setting}. Expected ${expectedType}`
        );
      }
    }

    // Check value range/options
    const validation = this.getSettingValidation(diff.setting);
    if (validation && diff.newValue !== undefined) {
      const result = validation(diff.newValue);
      if (!result.isValid) {
        errors.push(`Invalid value for ${diff.setting}: ${result.message}`);
      }
    }

    if (errors.length > 0) {
      this.emit("validationErrors", errors);
      return false;
    }

    return true;
  }

  
  /**
   * Resolve conflicts between settings.
   *
   * @private
   * 
   * @param {SettingsDiff} diff
   * @returns {Promise<void>}
   */
  private async resolveConflicts(diff: SettingsDiff): Promise<void> {
    const config = vscode.workspace.getConfiguration("browsechat");
    const conflicts = this.getSettingConflicts();

    if (diff.setting in conflicts) {
      const conflictingSettings = conflicts[diff.setting];
      for (const conflict of conflictingSettings) {
        const conflictValue = config.get(conflict.setting);
        if (conflictValue !== undefined) {
          const resolution = conflict.resolve(diff.newValue, conflictValue);
          if (resolution.shouldUpdate) {
            await config.update(
              conflict.setting,
              resolution.newValue,
              resolution.scope
            );
            this.emit("conflictResolved", {
              setting: diff.setting,
              conflictSetting: conflict.setting,
              resolution,
            });
          }
        }
      }
    }
  }

  
  /**
   * Check if the settings need to be migrated to the current version.
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async checkVersionMigration(): Promise<void> {
    const config = vscode.workspace.getConfiguration("browsechat");
    const currentVersion = config.get<string>("version");

    if (!currentVersion) {
      // First installation
      await this.updateVersion();
      return;
    }

    const version = this.parseVersion(currentVersion);
    if (this.shouldMigrate(version)) {
      await this.migrateSettings(version);
      await this.updateVersion();
    }
  }

  
  /**
   * Parse a version string into a SettingsVersion object.
   *
   * @private
   * @param {string} version
   * @returns {SettingsVersion}
   */
  private parseVersion(version: string): SettingsVersion {
    const [major, minor, patch] = version.split(".").map(Number);
    return { major, minor, patch };
  }

  
  /**
   * Verify if a version is newer than another version.
   *
   * @private
   * @param {SettingsVersion} version
   * @returns {boolean}
   */
  private shouldMigrate(version: SettingsVersion): boolean {
    return (
      version.major < SettingsIntegrationManager.CURRENT_VERSION.major ||
      (version.major === SettingsIntegrationManager.CURRENT_VERSION.major &&
        version.minor < SettingsIntegrationManager.CURRENT_VERSION.minor)
    );
  }

  
  /**
   * Migrate the settings to the current version.
   *
   * @private
   * 
   * @param {SettingsVersion} fromVersion
   * @returns {Promise<void>}
   */
  private async migrateSettings(fromVersion: SettingsVersion): Promise<void> {
    if (!this.shouldMigrate(fromVersion)) {
      return;
    }

    const migrations = this.getVersionMigrations();
    const config = vscode.workspace.getConfiguration('browsechat');

    for (const migration of migrations) {
      if (this.versionIsNewer(migration.version, fromVersion)) {
        await migration.migrate(config);
      }
    }

    await this.updateVersion();
  }

  
  /**
   * Verify if a version is newer than another version.
   *
   * @private
   * @param {SettingsVersion} v1
   * @param {SettingsVersion} v2
   * @returns {boolean}
   */
  private versionIsNewer(v1: SettingsVersion, v2: SettingsVersion): boolean {
    if (v1.major !== v2.major) {
      return v1.major > v2.major;
    }
    if (v1.minor !== v2.minor) {
      return v1.minor > v2.minor;
    }
    return v1.patch > v2.patch;
  }

  
  /**
   * Update the version of the settings.
   *
   * @private
   * 
   * @returns {Promise<void>}
   */
  private async updateVersion(): Promise<void> {
    const config = vscode.workspace.getConfiguration('browsechat');
    const version = `${SettingsIntegrationManager.CURRENT_VERSION.major}.${SettingsIntegrationManager.CURRENT_VERSION.minor}.${SettingsIntegrationManager.CURRENT_VERSION.patch}`;
    await config.update("version", version, true);
  }

  
  /**
   * Migrate the settings to the current version.
   *
   * @public
   * 
   * @returns {Promise<string>}
   */
  public async createBackup(): Promise<string> {
    const backup: SettingsBackup = {
      version: `${SettingsIntegrationManager.CURRENT_VERSION.major}.${SettingsIntegrationManager.CURRENT_VERSION.minor}.${SettingsIntegrationManager.CURRENT_VERSION.patch}`,
      timestamp: new Date().toISOString(),
      settings: await this.captureSettingsSnapshot(),
    };

    const backupPath = path.join(
      this.context.globalStorageUri.fsPath,
      "settings-backups"
    );
    await fs.mkdir(backupPath, { recursive: true });

    const filename = `backup-${backup.timestamp.replace(/[:.]/g, "-")}.json`;
    const filePath = path.join(backupPath, filename);
    await fs.writeFile(filePath, JSON.stringify(backup, null, 2));

    return filePath;
  }

  
  /**
   * Migrate the settings to the current version.
   *
   * @public
   * 
   * @param {?vscode.ConfigurationTarget} [scope]
   * @returns {Promise<any>}
   */
  public async resetSettings(
    scope?: vscode.ConfigurationTarget
  ): Promise<any> {
    const config = await this.getConfiguration(scope);
    return this.applyDefaults(config);
  }

  
  /**
   * Migrate the settings to the current version.
   *
   * @public
   * 
   * @param {?vscode.ConfigurationTarget} [scope]
   * @returns {Promise<any>}
   */
  public async getCurrentConfiguration(
    scope?: vscode.ConfigurationTarget
  ): Promise<any> {
    return this.getConfiguration(scope);
  }

  
  /**
   * Update a setting.
   *
   * @public
   * 
   * @param {string} key
   * @param {*} value
   * @param {vscode.ConfigurationTarget} scope
   * @returns {Promise<void>}
   */
  public async update(
    key: string,
    value: any,
    scope: vscode.ConfigurationTarget
  ): Promise<void> {
    await this.updateSetting(key, value, scope);
  }

  
  /**
   * Validate the settings.
   *
   * @public
   * 
   * @returns {Promise<boolean>}
   */
  public async validate(): Promise<boolean> {
    return this.validateSettings();
  }

  
  /**
   * Migrate the settings to the current version.
   *
   * @public
   * 
   * @param {string} fromVersion
   * @returns {Promise<void>}
   */
  public async migrate(fromVersion: string): Promise<void> {
    const version = this.parseVersion(fromVersion);
    await this.migrateSettings(version);
  }

  
  /**
   * Get the global configuration.
   *
   * @public
   * @returns {*}
   */
  public getGlobalConfiguration(): any {
    return vscode.workspace.getConfiguration('browsechat');
  }

  private async getConfiguration(
    scope?: vscode.ConfigurationTarget
  ): Promise<vscode.WorkspaceConfiguration> {
    const config = vscode.workspace.getConfiguration('browsechat');
    if (scope !== undefined) {
      // Instead of using inspect, we'll return the same config
      // The scope will be used when updating values
      return config;
    }
    return config;
  }

  
  /**
   * Apply default values to the configuration.
   *
   * @private
   * 
   * @param {vscode.WorkspaceConfiguration} config
   * @returns {Promise<any>}
   */
  private async applyDefaults(config: vscode.WorkspaceConfiguration): Promise<any> {
    const defaultConfig = {
      logFormat: 'default',
      maxFileSize: '100MB',
      theme: 'light',
      // Add other default values as needed
    };

    for (const [key, value] of Object.entries(defaultConfig)) {
      if (config.get(key) === undefined) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }

    return config;
  }

  
  /**
   * Update a setting in the configuration.
   *
   * @private
   * 
   * @param {string} key
   * @param {*} value
   * @param {vscode.ConfigurationTarget} scope
   * @returns {Promise<void>}
   */
  private async updateSetting(
    key: string,
    value: any,
    scope: vscode.ConfigurationTarget
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('browsechat');
    await config.update(key, value, scope);
  }

  
  /**
   * Get the list of required settings.
   *
   * @private
   * @returns {string[]}
   */
  private getRequiredSettings(): string[] {
    return [
      "logs.format.fileTypes",
      "logs.format.encoding",
      "general.maxFileSize",
    ];
  }

  
  /**
   * Get the list of setting dependencies.
   *
   * @private
   * @returns {{ [key: string]: string[] }}
   */
  private getSettingDependencies(): { [key: string]: string[] } {
    return {
      "detection.mode": ["logs.format.fileTypes"],
      "caching.enabled": ["general.maxFileSize"],
    };
  }

  
  /**
   * Get the list of deprecated settings.
   *
   * @private
   * @returns {{
   *     [key: string]: { since: string; replacedBy?: string };
   *   }}
   */
  private getDeprecatedSettings(): {
    [key: string]: { since: string; replacedBy?: string };
  } {
    return {
      "logs.path": {
        since: "1.0.0",
        replacedBy: "logs.locations",
      },
    };
  }

  
  /**
   * 
   * get all the settings with their default values and descriptions
   *
   * @private
   * @param {string} setting
   * @returns {(string | undefined)}
   */
  private getSettingType(setting: string): string | undefined {
    const types: { [key: string]: string } = {
      "general.maxFileSize": "number",
      "general.autoOpen": "boolean",
      "general.theme": "string",
      "detection.mode": "string",
    };
    return types[setting];
  }

  
  /**
   * Get the validation function for a specific setting.
   *
   * @private
   * @param {string} setting
   * @returns {((value: any) => { isValid: boolean; message?: string }) | undefined}
   */
  private getSettingValidation(
    setting: string
  ): ((value: any) => { isValid: boolean; message?: string }) | undefined {
    const validations: {
      [key: string]: (value: any) => { isValid: boolean; message?: string };
    } = {
      "general.maxFileSize": (value: number) => ({
        isValid: value > 0,
        message: "Must be positive",
      }),
      "general.theme": (value: string) => ({
        isValid: ["auto", "light", "dark"].includes(value),
        message: "Must be auto, light, or dark",
      }),
    };
    return validations[setting];
  }

  
  /**
   * Get the list of setting conflicts.
   *
   * @private
   * @returns {{
   *     [key: string]: Array<{
   *       setting: string;
   *       resolve: (
   *         newValue: any,
   *         conflictValue: any
   *       ) => {
   *         shouldUpdate: boolean;
   *         newValue?: any;
   *         scope?: vscode.ConfigurationTarget;
   *       };
   *     }>;
   *   }}
   */
  private getSettingConflicts(): {
    [key: string]: Array<{
      setting: string;
      resolve: (
        newValue: any,
        conflictValue: any
      ) => {
        shouldUpdate: boolean;
        newValue?: any;
        scope?: vscode.ConfigurationTarget;
      };
    }>;
  } {
    return {
      "detection.mode": [
        {
          setting: "logs.locations",
          resolve: (newValue: string, locations: string[]) => ({
            shouldUpdate: newValue === "auto" && locations.length > 0,
            newValue: [],
            scope: vscode.ConfigurationTarget.Global,
          }),
        },
      ],
      "caching.enabled": [
        {
          setting: "caching.maxSize",
          resolve: (enabled: boolean, maxSize: number) => ({
            shouldUpdate: enabled && maxSize <= 0,
            newValue: 100 * 1024 * 1024, // 100MB default
            scope: vscode.ConfigurationTarget.Global,
          }),
        },
      ],
    };
  }

  
  /**
   * Get the list of version migrations.
   *
   * @private
   * @returns {Array<{
   *     version: SettingsVersion;
   *     migrate: (config: vscode.WorkspaceConfiguration) => Promise<void>;
   *   }>}
   */
  private getVersionMigrations(): Array<{
    version: SettingsVersion;
    migrate: (config: vscode.WorkspaceConfiguration) => Promise<void>;
  }> {
    return [
      {
        version: { major: 1, minor: 0, patch: 0 },
        migrate: async (config) => {
          // Migrate from 0.x to 1.0
          const oldPath = config.get<string>("logs.path");
          if (oldPath) {
            await config.update("logs.locations", [oldPath], true);
            await config.update("logs.path", undefined, true);
          }
        },
      },
    ];
  }

  
  /**
   * Disposes of the manager.
   *
   * @public
   */
  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

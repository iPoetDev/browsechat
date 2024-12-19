import { Given, When, Then, Before } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as vscode from "vscode";
import { TestHelper } from "./settings.helper";
import { SettingsIntegrationManager } from "@settings/SettingsIntegrationManager";
import { LogFormatManager } from "@settings/LogFormatManager";
import { LogLocationManager } from "@settings/LogLocationManager";
import { WorkspaceDetectionManager } from "@settings/WorkspaceDetectionManager";
import { GeneralConfigurationManager } from "@settings/GeneralConfigurationManager";
import * as path from "path";
import { ConfigurationTarget } from "vscode";

let context: vscode.ExtensionContext;
let settingsManager: SettingsIntegrationManager;
let logFormatManager: LogFormatManager;
let logLocationManager: LogLocationManager;
let workspaceDetectionManager: WorkspaceDetectionManager;
let generalConfigManager: GeneralConfigurationManager;

Before(async () => {
  context = await TestHelper.createVSCodeContext();

  // Initialize individual managers first
  logFormatManager = new LogFormatManager(context);
  logLocationManager = new LogLocationManager(context);
  workspaceDetectionManager = new WorkspaceDetectionManager(context);
  generalConfigManager = new GeneralConfigurationManager(context);

  // Create managers object for SettingsIntegrationManager
  const managers = {
    format: logFormatManager,
    location: logLocationManager,
    detection: workspaceDetectionManager,
    general: generalConfigManager,
  };

  settingsManager = new SettingsIntegrationManager(context, managers);

  // Set up test environment
  await TestHelper.setupGlobalSettings();
});

Given("the VSCode extension context is initialized", () => {
  expect(context).to.exist;
});

Given("the settings manager is initialized", () => {
  expect(settingsManager).to.exist;
});

Given("the workspace is ready", async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  expect(workspaceFolders).to.exist;
  expect(workspaceFolders.length).to.be.greaterThan(0);
});

Given("the filesystem access is available", async () => {
  const fs = require('fs');
  const testFilePath = path.join(vscode.workspace.rootPath, 'test.txt');
  fs.writeFileSync(testFilePath, 'test');
  const fileExists = fs.existsSync(testFilePath);
  expect(fileExists).to.be.true;
  fs.unlinkSync(testFilePath);
});

// Scenario: Global Settings Integration

  Given("global extension settings exist", async () => {
    await TestHelper.createGlobalSettings();
    const settings = await TestHelper.getGlobalSettings();
    expect(settings).to.exist;
  });

  When("settings are loaded from VSCode", async () => {
    await settingsManager.loadSettings();
  });

  Then("global configurations should be retrieved", async () => {
    const settings = await settingsManager.getSettings();
    expect(settings).to.exist;
  });

  Then("default values should be applied where missing", async () => {
    const settings = await settingsManager.getSettings();
    const defaultSettings = await TestHelper.getDefaultSettings();
    for (const key in defaultSettings) {
      if (!settings[key]) {
        expect(settings[key]).to.equal(defaultSettings[key]);
      }
    }
  });

  Then("settings should be type-validated", async () => {
    const settings = await settingsManager.getSettings();
    const validationResult = await TestHelper.validateSettings(settings);
    expect(validationResult).to.be.true;
  });

  Then("changes should be persisted to global state", async () => {
    const newSettings = { someSetting: "newValue" };
    await settingsManager.updateSettings(newSettings);
    const updatedSettings = await settingsManager.getSettings();
    expect(updatedSettings.someSetting).to.equal("newValue");
  });

// Scenario: Workspace Settings Integration
Given("a workspace is active", async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  expect(workspaceFolders).to.exist;
  expect(workspaceFolders.length).to.be.greaterThan(0);
});

  When("workspace-specific settings are configured", async () => {
    const workspaceSettings = { someWorkspaceSetting: "workspaceValue" };
    await settingsManager.updateWorkspaceSettings(workspaceSettings);
  });

  Then("workspace settings should override globals", async () => {
    const globalSettings = await settingsManager.getSettings();
    const workspaceSettings = await settingsManager.getWorkspaceSettings();
    expect(workspaceSettings.someWorkspaceSetting).to.not.equal(globalSettings.someWorkspaceSetting);
  });

  Then("workspace state should be preserved", async () => {
    const workspaceState = await settingsManager.getWorkspaceState();
    expect(workspaceState).to.exist;
  });

  Then("changes should affect only current workspace", async () => {
    const workspaceSettings = await settingsManager.getWorkspaceSettings();
    const otherWorkspaceSettings = await settingsManager.getOtherWorkspaceSettings();
    expect(workspaceSettings.someWorkspaceSetting).to.not.equal(otherWorkspaceSettings.someWorkspaceSetting);
  });

  Then("settings should sync across workspace files", async () => {
    const workspaceSettings = await settingsManager.getWorkspaceSettings();
    const syncedSettings = await settingsManager.getSyncedWorkspaceSettings();
    expect(workspaceSettings).to.deep.equal(syncedSettings);
  });

// Scenario: Log Format Settings Integration

Given("log format configurations exist", async () => {
  await TestHelper.createLogFormatConfigurations();
  const logFormats = await TestHelper.getLogFormatConfigurations();
  expect(logFormats).to.exist;
});

  When("log format settings are loaded", async () => {
    await logFormatManager.loadSettings();
  });

  Then("parser should use correct format", async () => {
    const logFormat = await logFormatManager.getCurrentFormat();
    const expectedFormat = await TestHelper.getExpectedLogFormat();
    expect(logFormat).to.equal(expectedFormat);
  });

  Then("format validation should occur", async () => {
    const logFormat = await logFormatManager.getCurrentFormat();
    const isValid = await logFormatManager.validateFormat(logFormat);
    expect(isValid).to.be.true;
  });

  Then("invalid formats should be rejected", async () => {
    const invalidFormat = "invalidFormat";
    const isValid = await logFormatManager.validateFormat(invalidFormat);
    expect(isValid).to.be.false;
  });

  Then("format changes should update parser behavior", async () => {
    const newFormat = "newFormat";
    await logFormatManager.updateFormat(newFormat);
    const currentFormat = await logFormatManager.getCurrentFormat();
    expect(currentFormat).to.equal(newFormat);
  });

// Scenario: Log Location Settings Integration

Given("log file locations are configured", async () => {
  await TestHelper.createLogLocationConfigurations();
  const logLocations = await TestHelper.getLogLocationConfigurations();
  expect(logLocations).to.exist;
});

  When("location settings are loaded", async () => {
    await logLocationManager.loadSettings();
  });

  Then("filesystem paths should be validated", async () => {
    const logLocations = await logLocationManager.getLogLocations();
    for (const location of logLocations) {
      const isValid = await logLocationManager.validatePath(location);
      expect(isValid).to.be.true;
    }
  });

  Then("relative paths should be resolved", async () => {
    const logLocations = await logLocationManager.getLogLocations();
    for (const location of logLocations) {
      const resolvedPath = await logLocationManager.resolvePath(location);
      expect(path.isAbsolute(resolvedPath)).to.be.true;
    }
  });

  Then("invalid paths should be reported", async () => {
    const invalidPath = "invalid/path";
    const isValid = await logLocationManager.validatePath(invalidPath);
    expect(isValid).to.be.false;
  });

  Then("location changes should trigger reload", async () => {
    const newLocation = "new/log/location";
    await logLocationManager.updateLocation(newLocation);
    const currentLocation = await logLocationManager.getCurrentLocation();
    expect(currentLocation).to.equal(newLocation);
    const reloadTriggered = await logLocationManager.isReloadTriggered();
    expect(reloadTriggered).to.be.true;
  });

// Scenario: Workspace Detection Settings

Given("multiple workspace folders exist", async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  expect(workspaceFolders).to.exist;
  expect(workspaceFolders.length).to.be.greaterThan(1);
});

  When("workspace detection runs", async () => {
    await workspaceDetectionManager.detectWorkspaces();
  });

  Then("correct workspace should be identified", async () => {
    const detectedWorkspace = await workspaceDetectionManager.getDetectedWorkspace();
    const expectedWorkspace = await TestHelper.getExpectedWorkspace();
    expect(detectedWorkspace).to.equal(expectedWorkspace);
  });

  Then("workspace settings should be loaded", async () => {
    const workspaceSettings = await workspaceDetectionManager.getWorkspaceSettings();
    expect(workspaceSettings).to.exist;
  });

  Then("workspace state should be initialized", async () => {
    const workspaceState = await workspaceDetectionManager.getWorkspaceState();
    expect(workspaceState).to.exist;
  });

  Then("detection results should be cached", async () => {
    const cachedResults = await workspaceDetectionManager.getCachedDetectionResults();
    expect(cachedResults).to.exist;
    const detectedWorkspace = await workspaceDetectionManager.getDetectedWorkspace();
    expect(cachedResults).to.include(detectedWorkspace);
  });

// Scenario: General Configuration Integration

Given("general configurations are defined", async () => {
  await TestHelper.createGeneralConfigurations();
  const generalConfigurations = await TestHelper.getGeneralConfigurations();
  expect(generalConfigurations).to.exist;
});

  When("configuration changes occur", async () => {
    const newConfig = { someConfig: "newValue" };
    await generalConfigManager.updateConfiguration(newConfig);
  });

  Then("all components should be notified", async () => {
    const notifications = await generalConfigManager.getNotifications();
    expect(notifications).to.include("Configuration updated");
  });

  Then("dependent systems should update", async () => {
    const dependentSystemState = await generalConfigManager.getDependentSystemState();
    expect(dependentSystemState).to.equal("updated");
  });

  Then("configuration state should be consistent", async () => {
    const configState = await generalConfigManager.getConfigurationState();
    expect(configState).to.be.consistent;
  });

  Then("changes should be properly logged", async () => {
    const logs = await generalConfigManager.getLogs();
    expect(logs).to.include("Configuration change: someConfig = newValue");
  });

// Scenario: Settings Migration

Given("old settings format exists", async () => {
  await TestHelper.createOldSettingsFormat();
  const oldSettings = await TestHelper.getOldSettingsFormat();
  expect(oldSettings).to.exist;
});

When("settings migration is triggered", async () => {
  await settingsManager.migrateSettings();
});

Then("settings should be converted correctly", async () => {
  const newSettings = await settingsManager.getSettings();
  const expectedSettings = await TestHelper.getExpectedNewSettings();
  expect(newSettings).to.deep.equal(expectedSettings);
});

Then("old settings should be preserved", async () => {
  const oldSettings = await settingsManager.getOldSettings();
  expect(oldSettings).to.exist;
});

Then("new format should be validated", async () => {
  const newSettings = await settingsManager.getSettings();
  const isValid = await settingsManager.validateSettings(newSettings);
  expect(isValid).to.be.true;
});

Then("migration should be logged", async () => {
  const logs = await settingsManager.getLogs();
  expect(logs).to.include("Settings migration completed");
});

// Scenario: Settings Persistence

Given("settings changes are made", async () => {
  const newSettings = { someSetting: "newValue" };
  await settingsManager.updateSettings(newSettings);
});

  When("VSCode is restarted", async () => {
    await TestHelper.restartVSCode();
  });

  Then("all settings should be restored", async () => {
    const settings = await settingsManager.getSettings();
    expect(settings.someSetting).to.equal("newValue");
  });

  Then("custom states should persist", async () => {
    const customState = await settingsManager.getCustomState();
    expect(customState).to.exist;
  });

  Then("file locations should remain valid", async () => {
    const fileLocations = await logLocationManager.getLogLocations();
    for (const location of fileLocations) {
      const isValid = await logLocationManager.validatePath(location);
      expect(isValid).to.be.true;
    }
  });

  Then("configurations should be consistent", async () => {
    const configState = await generalConfigManager.getConfigurationState();
    expect(configState).to.be.consistent;
  });

// Scenario: Settings Error Handling

Given("invalid settings are introduced", async () => {
  const invalidSettings = { someSetting: null };
  await settingsManager.updateSettings(invalidSettings);
});

When("settings validation occurs", async () => {
  await settingsManager.validateSettings();
});

Then("appropriate errors should be shown", async () => {
  const errors = await settingsManager.getValidationErrors();
  expect(errors).to.include("Invalid value for someSetting");
});

Then("default values should be used", async () => {
  const settings = await settingsManager.getSettings();
  const defaultSettings = await TestHelper.getDefaultSettings();
  expect(settings.someSetting).to.equal(defaultSettings.someSetting);
});

Then("error state should be logged", async () => {
  const logs = await settingsManager.getLogs();
  expect(logs).to.include("Error: Invalid value for someSetting");
});

Then("recovery should be possible", async () => {
  const recoveryState = await settingsManager.recoverFromError();
  expect(recoveryState).to.be.true;
});

// Scenario: Multi-Root Workspace Settings

Given("multiple workspace roots exist", async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  expect(workspaceFolders).to.exist;
  expect(workspaceFolders.length).to.be.greaterThan(1);
});

  When("settings are accessed", async () => {
    await settingsManager.loadSettings();
  });

  Then("correct scope should be determined", async () => {
    const scope = await settingsManager.getCurrentScope();
    expect(scope).to.exist;
    expect(scope).to.be.oneOf(["global", "workspace", "root-specific"]);
  });

  Then("root-specific settings should apply", async () => {
    const rootSettings = await settingsManager.getRootSettings();
    expect(rootSettings).to.exist;
    const currentScope = await settingsManager.getCurrentScope();
    if (currentScope === "root-specific") {
      expect(rootSettings).to.deep.equal(await settingsManager.getSettings());
    }
  });

  Then("global settings should be preserved", async () => {
    const globalSettings = await settingsManager.getGlobalSettings();
    expect(globalSettings).to.exist;
  });

  Then("scope conflicts should be resolved", async () => {
    const conflicts = await settingsManager.getScopeConflicts();
    expect(conflicts).to.be.empty;
  });
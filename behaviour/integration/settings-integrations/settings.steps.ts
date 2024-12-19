/* eslint-disable */

/* eslint-disable max-len */
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

When("the settings manager is initialized", () => {
  expect(settingsManager).to.exist;
});

Then("it should load the default settings", async () => {
  const settings = await settingsManager.resetSettings();
  expect(settings).to.exist;
});

When("I request the global configuration", async () => {
  const config = await settingsManager.resetSettings(
    ConfigurationTarget.Global
  );
  expect(config).to.exist;
});

Then("it should return the workspace settings", async () => {
  const settings = await settingsManager.resetSettings(
    ConfigurationTarget.Workspace
  );
  expect(settings).to.exist;
});

Given("global extension settings exist", async () => {
  await TestHelper.setupGlobalSettings();
});

When("settings are loaded from VSCode", async () => {
  await settingsManager.getCurrentConfiguration();
});

Then("global configurations should be retrieved", () => {
  const config = settingsManager.getGlobalConfiguration();
  expect(config).to.not.be.undefined;
});

Then("default values should be applied where missing", () => {
  const config = settingsManager.getGlobalConfiguration();
  expect(config.logFormat).to.equal("default");
  expect(config.maxFileSize).to.equal("100MB");
});

Given("a workspace is active", async () => {
  await TestHelper.setupWorkspace();
});

When("workspace-specific settings are configured", async () => {
  await TestHelper.configureWorkspaceSettings({
    logFormat: "custom",
    logLocation: "./logs",
  });
});

Then("workspace settings should override globals", async () => {
  const settings = await settingsManager.getCurrentConfiguration();
  expect(settings.logFormat).to.equal("custom");
});

Given("the log format manager is initialized", () => {
  expect(logFormatManager).to.exist;
});

When("I load the log formats", async () => {
  await logFormatManager.getAvailableFormats();
});

Then("it should return the current format", async () => {
  const format = await logFormatManager.getFormat();
  expect(format).to.exist;
});

Given("log format configurations exist", async () => {
  await logFormatManager.init();
});

When("log format settings are loaded", async () => {
  await logFormatManager.getAvailableFormats();
});

Then("parser should use correct format", async () => {
  const format = await logFormatManager.getFormat();
  expect(format).to.have.property("pattern");
});

Given("the log location manager is initialized", () => {
  expect(logLocationManager).to.exist;
});

When("I load the log locations", async () => {
  await logLocationManager.getLocations();
});

Then("it should return valid locations", async () => {
  const locations = await logLocationManager.getLocations();
  expect(locations).to.exist;
  locations.forEach((location: string) => {
    expect(location).to.be.a("string").and.not.empty;
  });
});

Given("log file locations are configured", async () => {
  await TestHelper.setupLogLocations();
});

When("location settings are loaded", async () => {
  await logLocationManager.getLocations();
});

Then("filesystem paths should be validated", async () => {
  const locations = await logLocationManager.getValidLocations();
  expect(locations).to.be.an("array");
  locations.forEach((location: string) => {
    expect(path.isAbsolute(location)).to.be.true;
  });
});

Given("multiple workspace folders exist", async () => {
  await TestHelper.setupMultiRootWorkspace();
});

When("workspace detection runs", async () => {
  await workspaceDetectionManager.detectWorkspaces();
});

Then("correct workspace should be identified", async () => {
  const workspace = await workspaceDetectionManager.getCurrentWorkspace();
  expect(workspace).to.exist;
});

Given("general configurations are defined", async () => {
  await generalConfigManager.init();
});

When("configuration changes occur", async () => {
  await TestHelper.triggerConfigChange("browsechat.general.theme", "dark");
});

Then("all components should be notified", () => {
  expect(TestHelper.getConfigChangeNotifications()).to.have.length.greaterThan(
    0
  );
});

When("I validate the settings", async () => {
  const isValid = await settingsManager.validate();
  expect(isValid).to.be.true;
});

Given("old settings format exists", async () => {
  await TestHelper.setupLegacySettings();
});

When("settings migration is triggered", async () => {
  await settingsManager.migrate("0.9.0");
});

Then("settings should be converted correctly", async () => {
  const newSettings = await settingsManager.getCurrentConfiguration();
  expect(newSettings.version).to.equal("1.0.0");
});

Given("settings changes are made", async () => {
  await settingsManager.update(
    "theme",
    "dark",
    ConfigurationTarget.Global
  );
});

When("VSCode is restarted", async () => {
  await TestHelper.simulateVSCodeRestart(context);
});

Then("all settings should be restored", async () => {
  const settings = await settingsManager.getCurrentConfiguration();
  expect(settings.theme).to.equal("dark");
});

Given("invalid settings are introduced", async () => {
  await TestHelper.introduceInvalidSettings();
});

When("settings validation occurs", async () => {
  const isValid = await settingsManager.validate();
  expect(isValid).to.be.false;
});

Then("appropriate errors should be shown", () => {
  const errors = TestHelper.getValidationErrors();
  expect(errors).to.have.length.greaterThan(0);
});

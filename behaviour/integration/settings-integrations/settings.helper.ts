import type * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { ConfigurationTarget, workspace as VSCodeWorkspace } from "vscode";

export class TestHelper {
  private static configChangeNotifications: any[] = [];
  private static validationErrors: string[] = [];
  private static testWorkspacePath: string;

  static async createVSCodeContext(): Promise<vscode.ExtensionContext> {
    return {
      subscriptions: [],
      extensionPath: __dirname,
      globalState: new MockMemento(),
      workspaceState: new MockMemento(),
      asAbsolutePath: (relativePath: string) =>
        path.join(__dirname, relativePath),
    } as unknown as vscode.ExtensionContext;
  }

  static async setupGlobalSettings(): Promise<void> {
    await VSCodeWorkspace.getConfiguration().update(
      "browsechat",
      {
        logFormat: "default",
        maxFileSize: "100MB",
        theme: "system",
        autoSave: true,
      },
      vscode.ConfigurationTarget.Global
    );
  }

  static async setupWorkspace(): Promise<void> {
    this.testWorkspacePath = path.join(__dirname, "test-workspace");
    await fs.mkdir(this.testWorkspacePath, { recursive: true });

    // Create workspace settings file
    const settingsPath = path.join(this.testWorkspacePath, ".vscode");
    await fs.mkdir(settingsPath, { recursive: true });
    await fs.writeFile(
      path.join(settingsPath, "settings.json"),
      JSON.stringify({
        "browsechat.logFormat": "default",
        "browsechat.logLocation": "./logs",
      })
    );
  }

  static async configureWorkspaceSettings(settings: any): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await VSCodeWorkspace
        .getConfiguration()
        .update(
          `browsechat.${key}`,
          value,
          vscode.ConfigurationTarget.Workspace
        );
    }
  }

  static async setupLogLocations(): Promise<void> {
    const logsPath = path.join(this.testWorkspacePath, "logs");
    await fs.mkdir(logsPath, { recursive: true });
    await fs.writeFile(path.join(logsPath, "test.log"), "Test log content");
  }

  static async setupMultiRootWorkspace(): Promise<void> {
    const roots = ["root1", "root2", "root3"];
    for (const root of roots) {
      const rootPath = path.join(this.testWorkspacePath, root);
      await fs.mkdir(rootPath, { recursive: true });
      await fs.writeFile(
        path.join(rootPath, ".vscode", "settings.json"),
        JSON.stringify({
          "browsechat.logFormat": `${root}-format`,
          "browsechat.logLocation": "./logs",
        })
      );
    }
  }

  static async triggerConfigChange(section: string, value: any): Promise<void> {
    await VSCodeWorkspace
      .getConfiguration()
      .update(section, value, vscode.ConfigurationTarget.Global);
    this.configChangeNotifications.push({
      section,
      value,
      timestamp: new Date("2024-12-16T23:44:08Z"),
    });
  }

  static getConfigChangeNotifications(): any[] {
    return this.configChangeNotifications;
  }

  static async setupLegacySettings(): Promise<void> {
    const legacySettings = {
      "browsechat.format": "legacy",
      "browsechat.path": "./old/logs",
      "browsechat.autoSave": true,
    };

    for (const [key, value] of Object.entries(legacySettings)) {
      await VSCodeWorkspace
        .getConfiguration()
        .update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  static async simulateVSCodeRestart(
    context: vscode.ExtensionContext
  ): Promise<void> {
    // Save current state
    const currentState = {
      settings: VSCodeWorkspace.getConfiguration("browsechat"),
      globalState: context.globalState,
      workspaceState: context.workspaceState,
    };

    // Clear and restore state
    await context.globalState.update("settings", undefined);
    await context.workspaceState.update("settings", undefined);

    // Restore from saved state
    for (const [key, value] of Object.entries(currentState.settings)) {
      await VSCodeWorkspace
        .getConfiguration()
        .update(`browsechat.${key}`, value, vscode.ConfigurationTarget.Global);
    }
  }

  static async introduceInvalidSettings(): Promise<void> {
    const invalidSettings = {
      "browsechat.maxFileSize": "invalid",
      "browsechat.logFormat": {},
      "browsechat.theme": 123,
    };

    for (const [key, value] of Object.entries(invalidSettings)) {
      await VSCodeWorkspace
        .getConfiguration()
        .update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  static addValidationError(error: string): void {
    this.validationErrors.push(error);
  }

  static getValidationErrors(): string[] {
    return this.validationErrors;
  }

  static clearValidationErrors(): void {
    this.validationErrors = [];
  }

  static async cleanup(): Promise<void> {
    if (this.testWorkspacePath) {
      await fs.rm(this.testWorkspacePath, { recursive: true, force: true });
    }
    this.configChangeNotifications = [];
    this.validationErrors = [];
  }

  static validateSettingsSchema(settings: any): boolean {
    const requiredFields = ["logFormat", "maxFileSize", "theme"];
    return requiredFields.every((field) => field in settings);
  }
}

class MockMemento implements vscode.Memento {
  keys(): readonly string[] {
    throw new Error("Method not implemented.");
  }
  private storage = new Map<string, any>();

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get(key: string, defaultValue?: any) {
    return this.storage.get(key) ?? defaultValue;
  }

  update(key: string, value: any): Thenable<void> {
    this.storage.set(key, value);
    return Promise.resolve();
  }
}

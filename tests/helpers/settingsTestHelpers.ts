import * as vscode from "vscode";
import * as path from "path";

// tests/helpers/settingsTestHelper.ts
export class SettingsTestHelper {
  static async simulateConfigChange(setting: string, value: any) {
    const config = vscode.workspace.getConfiguration("browsechat");
    await config.update(setting, value, vscode.ConfigurationTarget.Global);
  }
}

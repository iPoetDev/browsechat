import * as vscode from "vscode";
import * as path from "path";

// tests/helpers/commandTestHelper.ts
export class CommandTestHelper {
  static async executeCommandWithInput(command: string, input: string) {
    // Simulate command palette input
    const quickPick = await vscode.window.createQuickPick();
    quickPick.value = input;
    await vscode.commands.executeCommand(command);
  }
}

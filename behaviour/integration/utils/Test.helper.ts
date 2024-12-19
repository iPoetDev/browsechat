// utils/TestHelper.ts
import type * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";


export class TestHelper {
    private static lastErrorMessage: string | undefined;
    private static windowStates: Map<string, WindowState> = new Map();
  
    static async createTestChatFile(
      context: vscode.ExtensionContext
    ): Promise<string> {
      const testContent = `
  Me: Test message 1
  Assistant: Response 1
  
  Me: Test message 2
  Assistant: Response 2
  `;
      const testDir = path.join(context.extensionPath, "test-data");
      await fs.mkdir(testDir, { recursive: true });
      const filePath = path.join(testDir, "test-chat.log");
      await fs.writeFile(filePath, testContent);
      return filePath;
    }
}
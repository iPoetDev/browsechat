import type * as vscode from "vscode";
// import * as path from "path";
// import type { ParsedPath, PlatformPath } from "path";
// import * as fs from "fs/promises";

const path = require('path');
const fs = require('fs/promises');
// const vscode = require('vscode');

import { ChatWebViewProvider } from "@ui/ChatWebViewProvider.js";
import { CommandManager } from "@commands/CommandManager";
import { DataModelManager } from "../../../src/models/DataModelManager";
import { ChatNavigationManager } from "@ui/ChatNavigationManager";
import { SearchManager } from "@ui/SearchManager";
import { OpenChatBrowserCommand } from "@commands/OpenChatBrowserCommand";
import { SearchChatsCommand } from "@commands/SearchChatsCommand";
import { ExportChatCommand } from "@commands/ExportChatCommand";
import { JumpToChatCommand } from "@commands/JumpToChatCommand";
import { FilterCommand } from "@commands/FilterCommand";
// import { Uri } from "@vscode/test-electron";
import { 
  Uri,
  ExtensionMode,
  EventEmitter,
  EnvironmentVariableMutatorType
} from "vscode";

// import * as OSpath from "path";
// import * as FSfiles from "fs/promises";

import type {
  ExtensionContext,
  Memento,
  SecretStorage,
  EnvironmentVariableCollection,
  EnvironmentVariableMutator,
  EnvironmentVariableScope,
  SecretStorageChangeEvent,
} from "vscode";

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

  static createTestContext(): ExtensionContext {
    const mockContext: Partial<ExtensionContext> = {
      extensionPath: __dirname,
      globalState: new MockMemento(),
      workspaceState: new MockMemento(),
      subscriptions: [],
      extensionUri: Uri.file(__dirname),
      asAbsolutePath: (relativePath: string) =>
        path.join(__dirname, relativePath),
      storageUri: Uri.file(path.join(__dirname, "storage")),
      globalStorageUri: Uri.file(path.join(__dirname, "global-storage")),
      logUri: Uri.file(path.join(__dirname, "logs")),
      extensionMode: ExtensionMode.Test,
      storagePath: path.join(__dirname, "storage"),
      globalStoragePath: path.join(__dirname, "global-storage"),
      logPath: path.join(__dirname, "logs"),
      environmentVariableCollection: new MockEnvironmentVariableCollection(),
      secrets: new MockSecretStorage(),
    };

    return mockContext as ExtensionContext;
  }

  static createTestComponents() {
    const context = this.createTestContext();
    const dataModel = new DataModelManager();
    const webviewProvider = new ChatWebViewProvider(
      context.extensionUri,
      dataModel
    );
    const navigationManager = new ChatNavigationManager(dataModel, context);
    const searchManager = new SearchManager(dataModel, context);
    const commandManager = new CommandManager(context, dataModel);

    return {
      context,
      dataModel,
      webviewProvider,
      navigationManager,
      searchManager,
      commandManager,
    };
  }

  static registerTestCommands(
    commandManager: CommandManager,
    context: vscode.ExtensionContext
  ) {
    commandManager.registerOpenChatBrowserCommand();
    commandManager.registerSearchChatsCommand();
    commandManager.registerExportChatCommand();
    commandManager.registerJumpToChatCommand();
    commandManager.registerFilterCommand();
  }

  static async selectChatSequence(
    webviewProvider: ChatWebViewProvider
  ): Promise<void> {
    if ("webview" in webviewProvider) {
      await (webviewProvider as any).webview?.postMessage({
        type: "select",
        chatId: "test-sequence-id",
      });
    }
  }

  static async simulateCommandFailure(
    commandManager: CommandManager,
    commandId: string,
    arg?: any
  ): Promise<void> {
    try {
      await commandManager.executeCommand(commandId, arg);
    } catch (error) {
      this.lastErrorMessage =
        error instanceof Error ? error.message : String(error);
    }
  }

  static async simulateMultipleWindows(): Promise<void> {
    this.windowStates.set("window1", new WindowState());
    this.windowStates.set("window2", new WindowState());
    this.windowStates.set("window3", new WindowState());
  }

  static getWindowState(windowId: string): WindowState | undefined {
    return this.windowStates.get(windowId);
  }

  static getLastErrorMessage(): string | undefined {
    return this.lastErrorMessage;
  }

  static async createTestDirectory(): Promise<string> {
    const testDir = path.join(__dirname, "test-files");
    await fs.mkdir(testDir, { recursive: true });
    return testDir;
  }

  static async createTestFile(content: string, testDir: string): Promise<string> {
    const filePath = path.join(testDir, `test-${Date.now()}.log`);
    await fs.writeFile(filePath, content);
    return filePath;
  }

  static async createLargeTestFile(testDir: string, sizeInMB: number): Promise<string> {
    const filePath = path.join(testDir, `large-test-${Date.now()}.log`);
    const content = "Me: Test message\n".repeat(sizeInMB * 1024 * 1024 / 16); // Approximate size
    await fs.writeFile(filePath, content);
    return filePath;
  }

  static async createMultipleTestFiles(testDir: string, count: number): Promise<string[]> {
    const files: string[] = [];
    for (let i = 0; i < count; i++) {
      const filePath = await this.createTestFile(`Me: Test message ${i}`, testDir);
      files.push(filePath);
    }
    return files;
  }

  static async createFilesWithMetadata(testDir: string, count: number): Promise<string[]> {
    const files: string[] = [];
    for (let i = 0; i < count; i++) {
      const content = `Me: Test message ${i}\n#tag${i}\nAssistant: Response ${i}`;
      const filePath = await this.createTestFile(content, testDir);
      files.push(filePath);
    }
    return files;
  }

  static async modifyTestFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(filePath, content + "\nMe: Modified message");
  }

  static generateChatContent(messageCount: number): string {
    let content = "";
    for (let i = 0; i < messageCount; i++) {
      content += `Me: Message ${i}\nAssistant: Response ${i}\n`;
    }
    return content;
  }

  static async checkFileSystemAccess(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async wasFileReadAsync(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static getChunkCount(content: string, chunkSize: number): number {
    return Math.ceil(content.length / chunkSize);
  }

  static getMemoryStats(): { heapUsed: number } {
    return process.memoryUsage();
  }

  static getConcurrentOperations(): number {
    // Mock implementation - in real scenario this would track actual concurrent operations
    return 1;
  }

  static async setupFileSystemScenarios(testDir: string): Promise<void> {
    await this.createTestFile("Me: Basic test", testDir);
    await this.createLargeTestFile(testDir, 1);
    await this.createMultipleTestFiles(testDir, 3);
  }

  static async cleanup(): Promise<void> {
    const testDir = path.join(__dirname, "test-files");
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up test directory:", error);
    }
  }
}

class WindowState {
  private state: Map<string, any> = new Map();

  isConsistent(): boolean {
    return true;
  }

  updateState(key: string, value: any): void {
    this.state.set(key, value);
  }

  getState(key: string): any {
    return this.state.get(key);
  }
}

class MockSecretStorage implements SecretStorage {
  private secrets = new Map<string, string>();
  private _onDidChange = new EventEmitter<SecretStorageChangeEvent>();
  readonly onDidChange = this._onDidChange.event;

  async get(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
    this._onDidChange.fire({ key }); // Fire the event with the updated key);
  }

  async delete(key: string): Promise<void> {
    this.secrets.delete(key);
    this._onDidChange.fire({ key });
  }
}

class MockEnvironmentVariableCollection
  implements EnvironmentVariableCollection
{
  private readonly _entries = new Map<string, EnvironmentVariableMutator>();

  persistent: boolean = true;
  description = "Mock Environment Variable Collection";

  replace(variable: string, value: string): void {
    this._entries.set(variable, {
      value,
      type: EnvironmentVariableMutatorType.Replace,
      options: {}, // Empty object instead of undefined
    });
  }

  append(variable: string, value: string): void {
    this._entries.set(variable, {
      value,
      type: EnvironmentVariableMutatorType.Append,
      options: {},
    });
  }

  prepend(variable: string, value: string): void {
    this._entries.set(variable, {
      value,
      type: EnvironmentVariableMutatorType.Prepend,
      options: {},
    });
  }

  get(variable: string): EnvironmentVariableMutator | undefined {
    return this._entries.get(variable);
  }

  forEach(
    callback: (
      variable: string,
      mutator: EnvironmentVariableMutator,
      collection: EnvironmentVariableCollection
    ) => any,
    thisArg?: any
  ): void {
    if (thisArg) {
      this._entries.forEach((mutator, variable) =>
        callback.call(thisArg, variable, mutator, this)
      );
    } else {
      this._entries.forEach((mutator, variable) =>
        callback(variable, mutator, this)
      );
    }
  }

  delete(variable: string): void {
    this._entries.delete(variable);
  }

  clear(): void {
    this._entries.clear();
  }

  getScoped(scope: EnvironmentVariableScope): EnvironmentVariableCollection {
    return this;
  }

  *[Symbol.iterator](): Iterator<[string, EnvironmentVariableMutator]> {
    for (const [variable, mutator] of this._entries.entries()) {
      yield [variable, mutator];
    }
  }
}

export class MockMemento implements Memento {
  private storage = new Map<string, any>();
  private syncKeys = new Set<string>();

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get(key: string, defaultValue?: any): any {
    const value = this.storage.get(key);
    return value !== undefined ? value : defaultValue;
  }

  update(key: string, value: any): Thenable<void> {
    this.storage.set(key, value);
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }

  setKeysForSync(keys: readonly string[]): void {
    this.syncKeys = new Set(keys);
  }
}

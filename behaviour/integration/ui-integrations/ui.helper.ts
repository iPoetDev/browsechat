import type * as vscode from "vscode";
import * as path from "path";
import { ChatWebViewProvider } from "@ui/ChatWebViewProvider";
import { DataModelManager } from "@models/DataModelManager";
import { ChatNavigationManager } from "@ui/ChatNavigationManager";
import { ChatSequenceImpl } from "@models/ChatSequence";
import { ChatSegment } from "@models/types";
import { Uri, ExtensionMode } from "vscode";

export class TestHelper {
  private static eventLog: any[] = [];
  private static lastErrorState: ErrorState = { message: "", handled: false };
  private static savedState: any = {};

  static async createVSCodeContext(): Promise<vscode.ExtensionContext> {
    const context = {
      subscriptions: [],
      extensionPath: __dirname,
      extensionUri: Uri.file(__dirname),
      storagePath: path.join(__dirname, "storage"),
      globalStoragePath: path.join(__dirname, "globalStorage"),
      logPath: path.join(__dirname, "logs"),
      extension: {} as vscode.Extension<any>,
      globalState: new MockMemento(),
      workspaceState: new MockMemento(),
      secrets: {
        get: (_key: string) => Promise.resolve(""),
        store: (_key: string, _value: string) => Promise.resolve(),
        delete: (_key: string) => Promise.resolve(),
      },
      storageUri: Uri.file(path.join(__dirname, "storage")),
      logUri: Uri.file(path.join(__dirname, "logs")),
      globalStorageUri: Uri.file(path.join(__dirname, "globalStorage")),
      extensionMode: ExtensionMode.Test,
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: (relativePath: string) => path.join(__dirname, relativePath),
      languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation,
    };
    return context as unknown as vscode.ExtensionContext;
  }

  static createWebviewView(): vscode.WebviewView {
    return {
      webview: {
        html: "",
        options: {
          enableScripts: true,
          localResourceRoots: [],
        },
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: async () => true,
        asWebviewUri: (uri: Uri) => uri,
      },
      onDidChangeVisibility: () => ({ dispose: () => {} }),
      onDidDispose: () => ({ dispose: () => {} }),
      visible: true,
      show: () => {},
      title: "Chat Browser",
      description: "Test Webview",
      badge: undefined,
      viewType: "chatBrowser",
    } as unknown as vscode.WebviewView;
  }

  static async loadTestChatSequence(dataModel: DataModelManager): Promise<void> {
    const testSegment: ChatSegment = {
      id: "test-segment",
      sequenceId: "test-sequence",
      startIndex: 0,
      endIndex: 100,
      content: "Test chat content",
      timestamp: Date,
      metadata: {
        participants: ["user", "assistant"],
        length: 100,
      }
    };

    const sequence = new ChatSequenceImpl("test.log", [testSegment]);
    await dataModel.addSequence(sequence);
  }

  static async enableNavigation(_navigation: ChatNavigationManager): Promise<void> {
    // Navigation is enabled in constructor, no need for explicit initialization
    return Promise.resolve();
  }

  static async enableThemeCustomization(webview: ChatWebViewProvider): Promise<void> {
    await webview.setState({
      scrollPosition: 0,
      selectedChat: "",
      theme: "light"
    });
  }

  static async changeTheme(theme: string): Promise<void> {
    await vscode.workspace.getConfiguration().update("workbench.colorTheme", theme, true);
  }

  static async configureErrorHandling(webview: ChatWebViewProvider): Promise<void> {
    // Reset webview state to handle any error conditions
    await webview.setState({
      scrollPosition: 0,
      selectedChat: "",
      theme: "light"
    });
    
    // Store error state in TestHelper
    TestHelper.lastErrorState = { message: "", handled: false };
  }

  static async simulateError(message: string): Promise<void> {
    TestHelper.lastErrorState = { message, handled: false };
    throw new Error(message);
  }

  static getLastErrorState(): ErrorState {
    return TestHelper.lastErrorState;
  }

  static async configureCleanup(context: vscode.ExtensionContext): Promise<void> {
    TestHelper.savedState = {
      theme: "dark",
      lastPosition: 100,
      searchHistory: ["test"],
    };
    await context.globalState.update("uiState", TestHelper.savedState);
  }

  static async deactivateExtension(context: vscode.ExtensionContext): Promise<void> {
    for (const disposable of context.subscriptions) {
      disposable.dispose();
    }
  }

  static async getSavedState(): Promise<any> {
    return TestHelper.savedState;
  }
}

interface ErrorState {
  message: string;
  handled: boolean;
}

class MockMemento implements vscode.Memento {
  private storage = new Map<string, any>();

  get<T>(_key: string): T | undefined;
  get<T>(_key: string, defaultValue: T): T;
  get(_key: string, defaultValue?: any) {
    return defaultValue;
  }

  update(_key: string, _value: any): Thenable<void> {
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }
}

import * as vscode from 'vscode';
// tests/mocks/vscode.ts
import {
  ProgressOptions,
  CancellationToken,
  Progress,
  QuickPick,
  QuickPickItem,
  Disposable,
  QuickInputButton,
  TextEditor,
  Event,
  EventEmitter,
} from "vscode";

// Mock QuickPick implementation
export class MockQuickPick<T extends QuickPickItem = QuickPickItem>
  implements QuickPick<T>
{
  onDidTriggerButton!: Event<QuickInputButton>;
  public value: string = "";
  public placeholder: string = "";
  public items: T[] = [];
  public selectedItems: T[] = [];
  public busy: boolean = false;
  public enabled: boolean = true;
  public title: string = "";
  public buttons: readonly QuickInputButton[] = [];
  public step: number = 1; // instead of step?: number
  public totalSteps: number = 1; // instead of totalSteps?: number
  public matchOnDescription: boolean = false;
  public matchOnDetail: boolean = false;
  public keepScrollPosition?: boolean;
  public activeItems: readonly T[] = [];
  public canSelectMany: boolean = false;
  public ignoreFocusOut: boolean = false;

  private readonly onDidTriggerItemButtonEmitter = new EventEmitter<{
    button: QuickInputButton;
    item: T;
  }>();
  public readonly onDidTriggerItemButton: Event<{
    button: QuickInputButton;
    item: T;
  }> = this.onDidTriggerItemButtonEmitter.event;

  private readonly onDidChangeValueEmitter = new EventEmitter<string>();
  public readonly onDidChangeValue: Event<string> =
    this.onDidChangeValueEmitter.event;

  private readonly onDidAcceptEmitter = new EventEmitter<void>();
  public readonly onDidAccept: Event<void> = this.onDidAcceptEmitter.event;

  private readonly onDidHideEmitter = new EventEmitter<void>();
  public readonly onDidHide: Event<void> = this.onDidHideEmitter.event;

  private readonly onDidChangeActiveEmitter = new EventEmitter<T[]>();
  public readonly onDidChangeActive: Event<T[]> =
    this.onDidChangeActiveEmitter.event;

  private readonly onDidChangeSelectionEmitter = new EventEmitter<T[]>();
  public readonly onDidChangeSelection: Event<T[]> =
    this.onDidChangeSelectionEmitter.event;

  public show(): void {
    // Implementation
  }

  public hide(): void {
    this.onDidHideEmitter.fire();
  }

  public dispose(): void {
    // Implementation
  }
}

export const mockVSCode = {
  window: {
    createQuickPick: jest.fn(() => new MockQuickPick()),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
    createTreeView: jest.fn(),
    showOpenDialog: jest.fn(),
    withProgress: jest
      .fn()
      .mockImplementation(
        async (
          options: ProgressOptions,
          task: (
            progress: Progress<any>,
            token: CancellationToken
          ) => Promise<any>
        ) => {
          return task(
            { report: jest.fn() },
            {
              isCancellationRequested: false,
              onCancellationRequested: jest.fn(),
            }
          );
        }
      ),
    createOutputChannel: jest.fn(),
    showTextDocument: jest.fn(),
    activeTextEditor: undefined as undefined | TextEditor,
    visibleTextEditors: [] as TextEditor[],
    onDidChangeActiveTextEditor: jest.fn(),
    onDidChangeVisibleTextEditors: jest.fn(),
    onDidChangeTextEditorSelection: jest.fn(),
    onDidChangeTextEditorVisibleRanges: jest.fn(),
    onDidChangeTextEditorOptions: jest.fn(),
    onDidChangeTextEditorViewColumn: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    executeCommand: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
    workspaceFolders: [
      {
        uri: vscode.Uri.file("/test/workspace"),
        name: "test",
        index: 0,
      },
    ],
    onDidChangeConfiguration: new EventEmitter(),
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      stat: jest.fn(),
    },
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    parse: (path: string) => ({ fsPath: path }),
  },
  ExtensionContext: jest.fn().mockImplementation(() => ({
    subscriptions: [],
    extensionPath: __dirname,
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    secrets: {
      get: jest.fn(),
      store: jest.fn(),
    },
  })),
  ProgressLocation: {
    Notification: 1,
    Window: 10,
    SourceControl: 1,
  },
  ThemeIcon: {
    File: "file",
    Folder: "folder",
  },
  QuickInputButtons: {
    Back: { iconPath: { light: "back-light.svg", dark: "back-dark.svg" } },
  },
};

// tests/mocks/fs.ts
export const mockFS = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
};

// tests/mocks/webview.ts
export class MockWebviewPanel {
  public readonly webview = {
    html: "",
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(),
  };

  public dispose = jest.fn();
}

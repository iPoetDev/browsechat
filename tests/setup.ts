// tests/setup.ts
import * as path from "path";

type TestEnvironment = {
  workspace: TestWorkspace;
  testDataPath: string;
  context: vscode.ExtensionContext & {
    subscriptions: any[];
    extensionPath: string;
    extensionUri: vscode.Uri;
    globalState: { get: jest.Mock; update: jest.Mock };
    workspaceState: { get: jest.Mock; update: jest.Mock };
    secrets: { get: jest.Mock; store: jest.Mock };
    storageUri: vscode.Uri | undefined;
    storagePath: string | undefined;
    globalStorageUri: vscode.Uri;
    globalStoragePath: string;
    logUri: vscode.Uri;
    logPath: string;
    extensionMode: vscode.ExtensionMode;
    environmentVariableCollection: vscode.EnvironmentVariableCollection;
    asAbsolutePath: (relativePath: string) => string;
  };
};

// Mock implementations must be defined before jest.mock calls
const mockFS = {
  mkdir: jest.fn().mockImplementation(async () => {}),
  writeFile: jest.fn().mockImplementation(async () => {}),
  readdir: jest.fn().mockImplementation(async () => []),
  readFile: jest.fn().mockImplementation(async () => ""),
  rm: jest.fn().mockImplementation(async () => {}),
  stat: jest.fn().mockImplementation(async () => ({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtime: new Date(),
  })),
};

// Create mock functions for VSCode APIs
const createStatusBarItem = jest.fn();
const registerCommand = jest.fn();
const executeCommand = jest.fn();
const setContext = jest.fn();

const mockVSCode = {
  window: {
    showInformationMessage: jest.fn(),
    createWebviewPanel: jest.fn(),
    showErrorMessage: jest.fn(),
    createStatusBarItem: createStatusBarItem,
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  commands: {
    registerCommand: registerCommand,
    executeCommand: executeCommand,
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  Disposable: {
    from: (...disposables: { dispose: () => any }[]) => ({
      dispose: () => disposables.forEach((d) => d.dispose()),
    }),
  },
  context: {
    setContext: setContext,
  },
};

// Mock modules
jest.mock("fs/promises", () => mockFS);
jest.mock("vscode", () => mockVSCode, { virtual: true });

// Import after mocks are set up
import * as vscode from "vscode";
import * as fs from "fs/promises";

export class TestWorkspace {
  private workspacePath: string;
  private sampleChatPath: string;

  constructor() {
    this.workspacePath = path.join(__dirname, ".test-workspace");
    this.sampleChatPath = path.resolve("D:/Code/VSIX/browsechat/proj/chat");
  }

  async create(): Promise<void> {
    await fs.mkdir(this.workspacePath, { recursive: true });
  }

  async createFile(fileName: string, content: string): Promise<void> {
    const filePath = path.join(this.workspacePath, fileName);
    await fs.writeFile(filePath, content, "utf8");
  }

  async copySampleFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.sampleChatPath);
      for (const file of files) {
        if (file.endsWith(".log")) {
          const sourcePath = path.join(this.sampleChatPath, file);
          const content = await fs.readFile(sourcePath, "utf8");
          await this.createFile(file, content);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not copy sample files: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    await fs.rm(this.workspacePath, { recursive: true, force: true });
  }

  getPath(): string {
    return this.workspacePath;
  }

  getSamplePath(): string {
    return this.sampleChatPath;
  }
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  const workspace = new TestWorkspace();
  const testDataPath = path.join(__dirname, "fixtures");

  await workspace.create();
  await workspace.copySampleFiles();
  await fs.mkdir(testDataPath, { recursive: true });

  const context: vscode.ExtensionContext = {
    subscriptions: [],
    extensionPath: __dirname,
    extensionUri: mockVSCode.Uri.file(__dirname),
    globalState: {
      get: jest.fn().mockImplementation((key) => {
        if (key === "chatLogPaths") {
          return [workspace.getSamplePath()];
        }
        return undefined;
      }),
      update: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
      setKeysForSync: jest.fn(),
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn().mockReturnValue([]),
    },
    secrets: {
      get: jest.fn(),
      store: jest.fn(),
      delete: function (key: string): Thenable<void> {
        throw new Error("Function not implemented.");
      },
      onDidChange: jest.fn(),
    },
    storageUri: mockVSCode.Uri.file(path.join(__dirname, "storage")),
    storagePath: path.join(__dirname, "storage"),
    globalStorageUri: mockVSCode.Uri.file(
      path.join(__dirname, "global-storage")
    ),
    globalStoragePath: path.join(__dirname, "global-storage"),
    logUri: mockVSCode.Uri.file(path.join(__dirname, "log")),
    logPath: path.join(__dirname, "log"),
    extensionMode: vscode.ExtensionMode.Test,
    environmentVariableCollection: {
      persistent: true,
      description: "Test Environment Variables",
      get: jest.fn(),
      getScoped: jest.fn().mockReturnValue({
        append: jest.fn(),
        prepend: jest.fn(),
        replace: jest.fn(),
        clear: jest.fn(),
        delete: jest.fn(),
        forEach: jest.fn(),
        [Symbol.iterator]: jest.fn(),
      }),
      append: jest.fn(),
      prepend: jest.fn(),
      replace: jest.fn(),
      clear: jest.fn(),
      delete: jest.fn(),
      forEach: jest.fn(),
      [Symbol.iterator]: jest.fn(),
    } as unknown as vscode.GlobalEnvironmentVariableCollection,
    asAbsolutePath: (relativePath: string) =>
      path.join(__dirname, relativePath),
    extension: {} as vscode.Extension<any>,
    languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation,
  };

  return {
    workspace,
    testDataPath,
    context,
  } as TestEnvironment;
}

export async function teardownTestEnvironment(
  workspace: TestWorkspace
): Promise<void> {
  await workspace.cleanup();
  jest.clearAllMocks();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVSCode.window.showInformationMessage.mockReset();
  mockVSCode.window.createWebviewPanel.mockReset();
  createStatusBarItem.mockReset();
  registerCommand.mockReset();
  executeCommand.mockReset();
  setContext.mockReset();
});

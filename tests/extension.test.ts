// tests/extension.test.ts
import * as vscode from "vscode";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  TestWorkspace,
} from "./setup";
import { mockVSCode } from "./mocks/vscode";
import { activate } from "../src/extension";

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
describe("BrowseChat Extension", () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment(testEnv.workspace);
  });

  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  test("workspace is initialized correctly", async () => {
    expect(testEnv.workspace).toBeDefined();
    expect(testEnv.workspace.getPath()).toContain(".test-workspace");
  });

  test("commands are registered", async () => {
    // Activate the extension
    await activate(testEnv.context);

    // Verify that the command registration was called with the correct command ID
    expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
      "browsechat.helloWorld",
      expect.any(Function)
    );

    // Verify the number of times registerCommand was called
    expect(mockVSCode.commands.registerCommand).toHaveBeenCalledTimes(1);

    // Verify that the command is added to extension subscriptions
    const registeredCommand =
      mockVSCode.commands.registerCommand.mock.results[0].value;
    expect(testEnv.context.subscriptions).toContain(registeredCommand);
  });

  test("extension context is properly mocked", () => {
    expect(testEnv.context.subscriptions).toBeDefined();
    expect(testEnv.context.extensionPath).toBeDefined();
    expect(testEnv.context.globalState.get).toBeDefined();
    expect(testEnv.context.workspaceState.update).toBeDefined();
    expect(testEnv.context.secrets.store).toBeDefined();
  });

  test("test data path exists", async () => {
    expect(testEnv.testDataPath).toBeDefined();
    expect(testEnv.testDataPath).toContain("fixtures");
  });
});

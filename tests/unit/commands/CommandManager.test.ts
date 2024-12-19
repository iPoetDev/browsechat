import * as vscode from "vscode";
import {
  CommandHistory,
  CommandManager,
  ExtensionState,
} from "../../../src/commands/CommandManager";
import { DataModelManager } from "../../../src/models/DataModelManager";
// import { ChatWebViewProvider } from "../../../src/ui/ChatWebViewProvider";
// import { ChatNavigationManager } from "../../../src/ui/ChatNavigationManager";
// import { OpenChatBrowserCommand } from "../../../src/commands/OpenChatBrowserCommand";
// import { JumpToChatCommand } from "../../../src/commands/JumpToChatCommand";
// import { ExportChatCommand } from "../../../src/commands/ExportChatCommand";
// import { SearchChatsCommand } from "../../../src/commands/SearchChatsCommand";
// import { FilterCommand } from "../../../src/commands/FilterCommand";

// Mock VSCode APIs
jest.mock("vscode");

describe("CommandManager", () => {
  let commandManager: CommandManager;
  let mockContext: vscode.ExtensionContext;
  let mockDataModel: jest.Mocked<DataModelManager>;
  let mockStatusBarItem: jest.Mocked<vscode.StatusBarItem>;
  let mockGlobalState: jest.Mocked<vscode.Memento>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock VSCode window
    mockStatusBarItem = {
      text: "",
      command: undefined,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<vscode.StatusBarItem>;

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(
      mockStatusBarItem
    );

    // Mock VSCode commands
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
    });
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

    // Mock extension context
    mockGlobalState = {
      get: jest.fn().mockReturnValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<vscode.Memento>;

    mockContext = {
      subscriptions: [],
      extensionUri: {} as vscode.Uri,
      globalState: mockGlobalState,
    } as unknown as vscode.ExtensionContext;

    // Mock DataModelManager
    mockDataModel = {
      getAllSequences: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<DataModelManager>;

    // Create CommandManager instance
    commandManager = new CommandManager(mockContext, mockDataModel);
  });

  describe("Initialization", () => {
    it("should initialize in Initializing state", () => {
      expect(mockStatusBarItem.text).toContain("Initializing");
      expect(mockStatusBarItem.command).toBeUndefined();
    });

    it("should register all commands", () => {
      const expectedCommands = [
        "browsechat.openBrowser",
        "browsechat.jumpToChat",
        "browsechat.exportChat",
        "browsechat.searchChats",
        "browsechat.filter",
      ];

      expectedCommands.forEach((commandId) => {
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
          commandId,
          expect.any(Function)
        );
      });
    });

    it("should setup status bar", () => {
      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it("should load command history", () => {
      expect(mockGlobalState.get).toHaveBeenCalledWith(
        "browsechat.commandHistory",
        []
      );
    });
  });

  describe("Command Registration", () => {
    it("should register command with enabledWhen boolean", async () => {
      const mockHandler = { execute: jest.fn().mockResolvedValue(undefined) };
      const commandId = "test.command";

      // @ts-ignore - private method
      commandManager.registerCommand(commandId, mockHandler, true);

      // Get the registered command callback
      const callback = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === commandId)[1];

      // Execute the command
      await callback();

      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it("should register command with enabledWhen function", async () => {
      const mockHandler = { execute: jest.fn().mockResolvedValue(undefined) };
      const commandId = "test.command";
      const enabledWhen = jest.fn().mockReturnValue(true);

      // @ts-ignore - private method
      commandManager.registerCommand(commandId, mockHandler, enabledWhen);

      // Get the registered command callback
      const callback = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === commandId)[1];

      // Execute the command
      await callback();

      expect(enabledWhen).toHaveBeenCalled();
      expect(mockHandler.execute).toHaveBeenCalled();
    });

    it("should handle command execution error", async () => {
      const mockHandler = {
        execute: jest.fn().mockRejectedValue(new Error("Test error")),
      };
      const commandId = "test.command";

      // @ts-ignore - private method
      commandManager.registerCommand(commandId, mockHandler, true);

      // Get the registered command callback
      const callback = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === commandId)[1];

      // Execute the command
      await callback();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Command test.command failed: Test error"
      );
    });
  });

  describe("State Management", () => {
    it("should update status bar when state changes", () => {
      // @ts-ignore - private method
      commandManager.setState(ExtensionState.Ready);
      expect(mockStatusBarItem.text).toContain("Ready");
      expect(mockStatusBarItem.command).toBe("browsechat.openBrowser");

      // @ts-ignore - private method
      commandManager.setState(ExtensionState.Processing);
      expect(mockStatusBarItem.text).toContain("Processing");
      expect(mockStatusBarItem.command).toBeUndefined();

      // @ts-ignore - private method
      commandManager.setState(ExtensionState.Error);
      expect(mockStatusBarItem.text).toContain("Error");
      expect(mockStatusBarItem.command).toBe("browsechat.showError");
    });

    it("should update command context when state changes", () => {
      // @ts-ignore - private method
      commandManager.setState(ExtensionState.Ready);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "setContext",
        "browsechat:state",
        ExtensionState.Ready
      );
    });
  });

  describe("Command History", () => {
    it("should record successful command execution", () => {
      const command = "test.command";
      const parameters = ["param1", "param2"];

      // @ts-ignore - private method
      commandManager.recordCommandExecution(command, parameters, "success");

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        "browsechat.commandHistory",
        expect.arrayContaining([
          expect.objectContaining({
            command,
            parameters,
            result: "success",
          }),
        ])
      );
    });

    it("should record failed command execution", () => {
      const command = "test.command";
      const parameters = ["param1"];
      const error = "Test error";

      // @ts-ignore - private method
      commandManager.recordCommandExecution(
        command,
        parameters,
        "error",
        error
      );

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        "browsechat.commandHistory",
        expect.arrayContaining([
          expect.objectContaining({
            command,
            parameters,
            result: "error",
            error,
          }),
        ])
      );
    });

    it("should limit command history size", () => {
      const maxSize = 100; // MAX_HISTORY_SIZE
      const commands: CommandHistory[] = Array.from({ length: maxSize + 10 }, (_, i) => ({
        timestamp: new Date(),
        command: `command${i}`,
        parameters: [] as any[],
        result: "success" as const,
      }));

      // @ts-ignore - private access
      commandManager.commandHistory = commands;

      // Record one more command
      // @ts-ignore - private method
      commandManager.recordCommandExecution("test.command", [], "success");

      expect(mockGlobalState.update).toHaveBeenCalledWith(
        "browsechat.commandHistory",
        expect.arrayContaining([
          expect.objectContaining({
            command: "test.command",
          }),
        ])
      );

      // @ts-ignore - private access
      expect(commandManager.commandHistory.length).toBe(maxSize);
    });
  });

  describe("Cleanup", () => {
    it("should dispose of all resources", () => {
      commandManager.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});

import * as vscode from "vscode";
import { DataModelManager } from "../models/DataModelManager";
import { OpenChatBrowserCommand } from "./OpenChatBrowserCommand";
import { JumpToChatCommand } from "./JumpToChatCommand";
import { ExportChatCommand } from "./ExportChatCommand";
import { SearchChatsCommand } from "./SearchChatsCommand";
import { FilterCommand } from "./FilterCommand";
import { ChatWebViewProvider } from "../ui/ChatWebViewProvider";
import { ChatNavigationManager } from "../ui/ChatNavigationManager";

export enum ExtensionState {
  Initializing = "initializing",
  Ready = "ready",
  Processing = "processing",
  Error = "error",
}

export interface CommandHistory {
  timestamp: Date;
  command: string;
  parameters?: any;
  result: "success" | "error";
  error?: string;
}

export class CommandManager {
  /**
   * Registers the "browsechat.openBrowser" command.
   * This command opens the chat browser view for a single log file.
   * @throws {Error} if not implemented
   */
  registerOpenChatBrowserCommand() {
    throw new Error("Method not implemented.");
  }
  /**
   * Registers the "browsechat.searchChats" command.
   * This command allows the user to search for a string in all chat logs.
   * @throws {Error} if not implemented
   */
  registerSearchChatsCommand() {
    throw new Error("Method not implemented.");
  }
  /**
   * Registers the "browsechat.exportChat" command.
   * This command exports the chat data to a file.
   * @throws {Error} if not implemented
   */
  registerExportChatCommand() {
    throw new Error("Method not implemented.");
  }
  /**
   * Registers the "browsechat.jumpToChat" command.
   * This command jumps to a specific chat in the chat log.
   * @throws {Error} if not implemented
   */
  registerJumpToChatCommand() {
    throw new Error("Method not implemented.");
  }
  /**
   * Registers the "browsechat.filter" command.
   * This command filters the chat log by a specific filter.
   * @throws {Error} if not implemented
   */
  registerFilterCommand() {
    throw new Error("Method not implemented.");
  }
  /**
   * Executes a command.
   * @param command - The command to execute.
   * @param parameters - The parameters for the command.
   * @throws {Error} if not implemented
   */
  executeCommand(command: string, parameters: { type: string }) {
    throw new Error("Method not implemented.");
  }

  private static readonly HISTORY_KEY = "browsechat.commandHistory";
  
  private static readonly MAX_HISTORY_SIZE = 100;

  private state: ExtensionState = ExtensionState.Initializing;
  
  private commandHistory: CommandHistory[] = [];
 
  private statusBarItem: vscode.StatusBarItem =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
 
    private commands: Map<string, vscode.Disposable> = new Map();

  /**
   * Constructor for the CommandManager class.
   * @param context - The VSCode extension context.
   * @param dataModel - The data model manager.
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dataModel: DataModelManager
  ) {
    this.initializeCommands();
    this.setupStatusBar();
    this.loadCommandHistory();
    this.registerKeyboardShortcuts();

  }
  /**
   * Registers all commands with the VSCode extension context.
   * The commands are split into two categories: always available and data-dependent.
   * The always available commands are:
   * - openBrowser: opens the chat browser view for a single log file
   * The data-dependent commands are:
   * - jumpToChat: jumps to a specific chat in the chat log
   * - exportChat: exports the chat data to a file
   * - searchChats: searches for a string in all chat logs
   * - filter: filters the chat log by a specific filter
   *
   * #TODO To Implement The data-dependent commands are only enabled if the respective data is available.
   * The availability of the data is determined by the following functions:
   * - hasOpenLogs: determines if there are open logs
   * - hasSelections: determines if there are selections in the chat log
   * - hasIndexedContent: determines if there is indexed content
   * - hasLoadedData: determines if there is loaded data
   *
   * After registering all commands, the extension state is set to "ready".
   */
  private async initializeCommands() {
    // Basic commands - always available
    const webViewProvider = new ChatWebViewProvider(
      this.context.extensionUri,
      this.dataModel
    );
    this.registerCommand(
      "browsechat.openBrowser",
      new OpenChatBrowserCommand(this.dataModel, webViewProvider, this.context),
      true
    );

    // Data-dependent commands
    const navigationManager = new ChatNavigationManager(
      this.dataModel,
      this.context
    );
    this.registerCommand(
      "browsechat.jumpToChat",
      new JumpToChatCommand(this.dataModel, navigationManager, this.context),
      () => this.hasOpenLogs()
    );

    this.registerCommand(
      "browsechat.exportChat",
      new ExportChatCommand(this.dataModel, this.context),
      () => this.hasSelections()
    );

    this.registerCommand(
      "browsechat.searchChats",
      new SearchChatsCommand(this.dataModel, this.context),
      () => this.hasIndexedContent()
    );

    this.registerCommand(
      "browsechat.filter",
      new FilterCommand(this.dataModel, this.context),
      () => this.hasLoadedData()
    );

    // Set initial state
    this.setState(ExtensionState.Ready);
  }

  /**
   * Registers a command with VS Code and stores it in the commands map.
  *
   * The command is wrapped with additional functionality to:
   * - check if the command should be enabled
   * - set the extension state to "processing" while the command is executing
   * - record the command execution with the history manager
   * - set the extension state to "error" if the command fails
   * - show an error message if the command fails
  *
  * @param commandId the id of the command to register
  * @param handler the command handler function
  * @param enabledWhen a boolean or a function returning a boolean that determines if the command should be enabled
  */
  private registerCommand(
    commandId: string,
    handler: { execute: (...args: any[]) => Promise<void> },
    enabledWhen: boolean | (() => boolean)
  ) {
    const wrappedCommand = vscode.commands.registerCommand(
      commandId,
      async (...args) => {
        try {
          // Check if command should be enabled
          const isEnabled =
            typeof enabledWhen === "function" ? enabledWhen() : enabledWhen;
          if (!isEnabled) {
            throw new Error("Command not available in current state");
          }

          // Set processing state
          const previousState = this.state;
          this.setState(ExtensionState.Processing);

          // Execute command
          await handler.execute(...args);

          // Record success
          this.recordCommandExecution(commandId, args, "success");

          // Restore previous state
          this.setState(previousState);
        } catch (error) {
          // Record error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.recordCommandExecution(commandId, args, "error", errorMessage);

          // Set error state
          this.setState(ExtensionState.Error);

          // Show error
          vscode.window.showErrorMessage(
            `Command ${commandId} failed: ${errorMessage}`
          );
        }
      }
    );

    this.commands.set(commandId, wrappedCommand);
    this.context.subscriptions.push(wrappedCommand);
  }

  /**
   * Sets up the status bar item to show the extension state.
   * Adds the status bar item to the context subscriptions and updates the status bar item.
   */
  private setupStatusBar() {
    this.context.subscriptions.push(this.statusBarItem);
    this.updateStatusBar();
  }

  /**
   * Updates the status bar item to show the current extension state.
   * The state is reflected in the text and command of the status bar item.
   * The text will be:
   * - "$(sync~spin) BrowseChat: Initializing..." for ExtensionState.Initializing
   * - "$(check) BrowseChat: Ready" for ExtensionState.Ready
   * - "$(sync~spin) BrowseChat: Processing..." for ExtensionState.Processing
   * - "$(error) BrowseChat: Error" for ExtensionState.Error
   * The command will be:
   * - undefined for ExtensionState.Initializing and ExtensionState.Processing
   * - "browsechat.openBrowser" for ExtensionState.Ready
   * - "browsechat.showError" for ExtensionState.Error
   */
  private updateStatusBar() {
    switch (this.state) {
      case ExtensionState.Initializing:
        this.statusBarItem.text = "$(sync~spin) BrowseChat: Initializing...";
        this.statusBarItem.command = undefined;
        break;
      case ExtensionState.Ready:
        this.statusBarItem.text = "$(check) BrowseChat: Ready";
        this.statusBarItem.command = "browsechat.openBrowser";
        break;
      case ExtensionState.Processing:
        this.statusBarItem.text = "$(sync~spin) BrowseChat: Processing...";
        this.statusBarItem.command = undefined;
        break;
      case ExtensionState.Error:
        this.statusBarItem.text = "$(error) BrowseChat: Error";
        this.statusBarItem.command = "browsechat.showError";
        break;
    }
    this.statusBarItem.show();
  }

  /**
   * Loads the command history from the global state.
   * The history is stored under the key {@link CommandManager.HISTORY_KEY}.
   * If the key is not present, an empty array is returned.
   * @returns The loaded command history.
   */
  private async loadCommandHistory() {
    this.commandHistory = this.context.globalState.get<CommandHistory[]>(
      CommandManager.HISTORY_KEY,
      []
    );
  }

  /**
   * Saves the command history to the global state.
   * The history is stored under the key {@link CommandManager.HISTORY_KEY}.
   */
  private async saveCommandHistory() {
    await this.context.globalState.update(
      CommandManager.HISTORY_KEY,
      this.commandHistory
    );
  }

  /**
   * Records a command execution in the command history.
   * The history item is saved in the global state under the key {@link CommandManager.HISTORY_KEY}.
   * If the history length exceeds the maximum size, the oldest items are dropped.
   * @param command the command id
   * @param parameters the command parameters
   * @param result the result of the command execution, either "success" or "error"
   * @param error the error message, if the command execution failed
   */
  private recordCommandExecution(
    command: string,
    parameters: any[],
    result: "success" | "error",
    error?: string
  ) {
    this.commandHistory.unshift({
      timestamp: new Date(),
      command,
      parameters,
      result,
      error,
    });

    // Trim history if needed
    if (this.commandHistory.length > CommandManager.MAX_HISTORY_SIZE) {
      this.commandHistory = this.commandHistory.slice(
        0,
        CommandManager.MAX_HISTORY_SIZE
      );
    }

    this.saveCommandHistory();
  }

  /**
   * Registers keyboard shortcuts for the commands.
   * The shortcuts are registered as `command.keyboard` commands.
   * When the shortcut is pressed, the corresponding command is executed.
   * The shortcuts are only registered if the corresponding command is available.
   * The availability of the command is determined by the `when` clause.
   * If the `when` clause is not specified, the shortcut is always registered.
   * The registered shortcuts are stored in the context subscriptions.
   */
  private registerKeyboardShortcuts() {
    // Register keyboard shortcuts
    const shortcuts = [
      { command: "browsechat.openBrowser", key: "ctrl+b", when: "true" },
      {
        command: "browsechat.jumpToChat",
        key: "ctrl+j",
        when: "browsechat:hasOpenLogs",
      },
      {
        command: "browsechat.exportChat",
        key: "ctrl+e",
        when: "browsechat:hasSelections",
      },
      {
        command: "browsechat.searchChats",
        key: "ctrl+f",
        when: "browsechat:hasIndexedContent",
      },
      {
        command: "browsechat.filter",
        key: "ctrl+l",
        when: "browsechat:hasLoadedData",
      },
    ];

    shortcuts.forEach((shortcut) => {
      const disposable = vscode.commands.registerCommand(
        `${shortcut.command}.keyboard`,
        () => vscode.commands.executeCommand(shortcut.command)
      );
      this.context.subscriptions.push(disposable);
    });
  }

  /**
   * Sets the state of the extension.
   * The state is used to determine which commands are available.
   * The state is also used to update the status bar and command context.
   * @param newState The new state of the extension.
   */
  public setState(newState: ExtensionState) {
    this.state = newState;
    this.updateStatusBar();
    this.updateCommandContext();
  }

  /**
   * Updates the VS Code context for when clauses.
   * This is done by setting the "browsechat:state" context to the current state of the extension.
   * The context is also updated for the following when clauses:
   * - "browsechat:hasOpenLogs"
   * - "browsechat:hasSelections"
   * - "browsechat:hasIndexedContent"
   * - "browsechat:hasLoadedData"
   * This is done so that the commands that are available can be determined
   * by the state of the extension and the availability of data.
   */
  private updateCommandContext() {
    // Update VS Code context for when clauses
    vscode.commands.executeCommand(
      "setContext",
      "browsechat:state",
      this.state
    );
    vscode.commands.executeCommand(
      "setContext",
      "browsechat:hasOpenLogs",
      this.hasOpenLogs()
    );
    vscode.commands.executeCommand(
      "setContext",
      "browsechat:hasSelections",
      this.hasSelections()
    );
    vscode.commands.executeCommand(
      "setContext",
      "browsechat:hasIndexedContent",
      this.hasIndexedContent()
    );
    vscode.commands.executeCommand(
      "setContext",
      "browsechat:hasLoadedData",
      this.hasLoadedData()
    );
  }

  // State check methods
  private hasOpenLogs(): boolean {
    return (
      this.state === ExtensionState.Ready &&
      this.dataModel.getAllSequences().length > 0
    );
  }

  /**
   * Checks if there are any selections in the currently open logs.
   * TODO: Implement a proper check for selections, currently just returns true if there are open logs.
   * @returns True if there are selections, false otherwise.
   */
  private hasSelections(): boolean {
    // TODO: Implement selection check
    return this.hasOpenLogs();
  }

  /**
   * Checks if there is indexed content in the currently open logs.
   * TODO: Implement a proper check for indexed content, currently just returns true if there are open logs.
   * @returns True if there is indexed content, false otherwise.
   */
  private hasIndexedContent(): boolean {
    // TODO: Implement indexed content check
    return this.hasOpenLogs();
  }

  private hasLoadedData(): boolean {
    return this.hasOpenLogs();
  }

  /**
   * Opens a webview panel showing the command history of the extension.
   * @example
   * **/
  // Public methods for extension
  public dispose() {
    this.statusBarItem.dispose();
    this.commands.forEach((command) => command.dispose());
  }

  /**
   * Opens a webview panel showing the command history of the extension.
   * The panel shows all commands executed by the user, along with their parameters, result and any errors.
   * The panel is retained when hidden to prevent loss of history.
   * @example
   * const commandManager = await vscode.commands.getCommand('browsechat.commandManager').then(c => c.create());
   * await commandManager.showCommandHistory();
   */
  public async showCommandHistory() {
    const panel = vscode.window.createWebviewPanel(
      "browsechat.commandHistory",
      "Command History",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.generateHistoryHtml();
  }

  /**
   * Generates the HTML for the command history webview panel.
   * The generated HTML will show a list of all commands executed by the user,
   * along with their parameters, result and any errors.
   * The HTML is styled to match Visual Studio Code.
   * @returns The generated HTML string.
   */
  private generateHistoryHtml(): string {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                    }
                    .history-item {
                        margin-bottom: 10px;
                        padding: 10px;
                        border: 1px solid var(--vscode-widget-border);
                    }
                    .success {
                        border-left: 3px solid var(--vscode-testing-iconPassed);
                    }
                    .error {
                        border-left: 3px solid var(--vscode-testing-iconFailed);
                    }
                    .timestamp {
                        color: var(--vscode-descriptionForeground);
                    }
                    .command {
                        font-weight: bold;
                    }
                    .parameters {
                        font-family: var(--vscode-editor-font-family);
                        margin: 5px 0;
                    }
                    .error-message {
                        color: var(--vscode-errorForeground);
                    }
                </style>
            </head>
            <body>
                ${this.commandHistory
                  .map(
                    (item) => `
                    <div class="history-item ${item.result}">
                        <div class="timestamp">
                            ${item.timestamp.toLocaleString()}
                        </div>
                        <div class="command">
                            ${item.command}
                        </div>
                        ${
                          item.parameters
                            ? `
                            <pre class="parameters">
                                ${JSON.stringify(item.parameters, null, 2)}
                            </pre>
                        `
                            : ""
                        }
                        ${
                          item.error
                            ? `
                            <div class="error-message">
                                ${item.error}
                            </div>
                        `
                            : ""
                        }
                    </div>
                `
                  )
                  .join("")}
            </body>
            </html>
        `;
  }
}

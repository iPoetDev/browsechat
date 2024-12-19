import { Given, When, Then, Before } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as vscode from "vscode";
import { CommandManager } from "@commands/CommandManager";
import { OpenChatBrowserCommand } from "@commands/OpenChatBrowserCommand";
import { SearchChatsCommand } from "@commands/SearchChatsCommand";
import { ExportChatCommand } from "@commands/ExportChatCommand";
import { JumpToChatCommand } from "@commands/JumpToChatCommand";
import { FilterCommand } from "@commands/FilterCommand";
import { ChatWebViewProvider } from "@ui/ChatWebViewProvider";
import { ChatTreeProvider } from "@ui/ChatTreeProvider";
import { ChatNavigationManager } from "@ui/ChatNavigationManager";
import { DataModelManager } from "@models/DataModelManager";
import { SearchManager } from "@ui/SearchManager";
import { TestHelper } from "./command.helper";

let context: vscode.ExtensionContext;
let commandManager: CommandManager;
let dataModelManager: DataModelManager;
let webviewProvider: ChatWebViewProvider;
let treeProvider: ChatTreeProvider;
let navigationManager: ChatNavigationManager;
let searchManager: SearchManager;

type OpenCommandArgs = { type: "open" };
type SearchCommandArgs = { type: "search"; query: string };
type ExportCommandArgs = { type: "export" };
type JumpCommandArgs = { type: "jump"; chatId: string };
type FilterCommandArgs = { type: "filter"; pattern: string };

type CommandArgs =
  | OpenCommandArgs
  | SearchCommandArgs
  | ExportCommandArgs
  | JumpCommandArgs
  | FilterCommandArgs;

Before(async () => {
  // Initialize test environment using TestHelper
  const components = TestHelper.createTestComponents();
  context = components.context;
  dataModelManager = components.dataModel;
  webviewProvider = components.webviewProvider;
  navigationManager = components.navigationManager;
  searchManager = components.searchManager;
  commandManager = components.commandManager;
  treeProvider = new ChatTreeProvider(dataModelManager);

  // Register all test commands
  TestHelper.registerTestCommands(commandManager, context);
});

Given("the VSCode extension context is initialized", () => {
  expect(context).to.not.be.undefined;
  expect(context.subscriptions).to.be.an("array");
});

Given("the command manager is registered", () => {
  // Commands are already registered in Before hook
  expect(commandManager).to.not.be.undefined;
});

Given("the data model is ready", () => {
  expect(dataModelManager.isInitialized()).to.be.true;
});

Given("the UI components are loaded", () => {
  expect(webviewProvider).to.not.be.undefined;
  expect(treeProvider).to.not.be.undefined;
});

Given("a valid chat file exists in the workspace", async () => {
  await TestHelper.createTestChatFile(context);
});

When("the open chat browser command is triggered", async () => {
  commandManager.executeCommand("browsechat.openChatBrowser", { type: "open" });
});

Then("the webview should be created", () => {
  expect(webviewProvider.getWebview()).to.not.be.undefined;
});

Then("the chat data should be loaded in the model", () => {
  const segments = dataModelManager.getAllSegments();
  expect(segments).to.not.be.undefined;
  expect(Array.isArray(segments)).to.be.true;
  expect(segments.length).to.be.greaterThan(0);
});

When("the search command is executed with {string}", async (query: string) => {
  const args: SearchCommandArgs = { type: "search", query };
  commandManager.executeCommand("browsechat.searchChats", args);
});

Then("the search manager should process the query", () => {
  expect(searchManager.getLastQuery()).to.equal("test query");
});

Then("matching results should be displayed in the UI", () => {
  const results = webviewProvider.getSearchResults();
  expect(results).to.not.be.empty;
});

Given("a chat sequence is selected in the UI", async () => {
  await TestHelper.selectChatSequence(webviewProvider);
});

When("the export command is triggered", async () => {
  commandManager.executeCommand("browsechat.exportChat", { type: "export" });
});

Then("the data model should prepare the chat data", () => {
  expect(dataModelManager.getExportData()).to.not.be.undefined;
});

When("the jump to chat command is triggered with a specific ID", async () => {
  const args: JumpCommandArgs = { type: "jump", chatId: "test-chat-id" };
  commandManager.executeCommand("browsechat.jumpToChat", args);
});

Then("the navigation manager should locate the chat", () => {
  expect(navigationManager.getCurrentLocation()).to.equal("test-chat-id");
});

Then("the UI should scroll to the target chat", () => {
  expect(webviewProvider.getCurrentScrollPosition()).to.not.be.undefined;
});

When("a command fails during execution", async () => {
  await TestHelper.simulateCommandFailure(
    commandManager,
    "browsechat.nonexistentCommand"
  );
});

Then("appropriate error messages should be shown", () => {
  expect(TestHelper.getLastErrorMessage()).to.not.be.undefined;
});

Then("the UI should remain in a consistent state", () => {
  expect(webviewProvider.isInConsistentState()).to.be.true;
  expect(treeProvider.isInConsistentState()).to.be.true;
});

Given("multiple VSCode windows are open", async () => {
  await TestHelper.simulateMultipleWindows();
});

When("commands modify the extension state", async () => {
  const args: FilterCommandArgs = { type: "filter", pattern: "test" };
  commandManager.executeCommand("browsechat.filter", args);
});

Then("all windows should reflect the changes", () => {
  // Use getWindowState instead of getAllWindowStates
  const window1State = TestHelper.getWindowState("window1");
  const window2State = TestHelper.getWindowState("window2");
  const window3State = TestHelper.getWindowState("window3");

  expect(window1State?.isConsistent()).to.be.true;
  expect(window2State?.isConsistent()).to.be.true;
  expect(window3State?.isConsistent()).to.be.true;
});

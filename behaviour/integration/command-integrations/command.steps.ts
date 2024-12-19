import { Scenario, Given, When, Then, Before } from "@cucumber/cucumber";
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

// Scenario: Command Integration Setp

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

// Open Chat Browser Command Integration

Given("a valid chat file exists in the workspace", async () => {
  await TestHelper.createTestChatFile(context);
});

When("the open chat browser command is triggered", async () => {
  await commandManager.executeCommand("browsechat.openChatBrowser", { type: "open" });
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

Then("the navigation state should be initialized", () => {
  expect(navigationManager.isInitialized()).to.be.true;
});

Then("the tree view should be updated", () => {
  expect(treeProvider.isUpdated()).to.be.true;
});

// Scenario: Search Chats Command Integration

Given("multiple chat files exist in the workspace", async () => {
  await TestHelper.createMultipleTestChatFiles(context);
  expect(await TestHelper.getChatFileCount()).to.be.greaterThan(1);
});

When("the search command is executed with {string}", async (query: string) => {
  const args: SearchCommandArgs = { type: "search", query };
  await commandManager.executeCommand("browsechat.searchChats", args);
});

Then("the search manager should process the query", () => {
  expect(searchManager.getLastQuery()).to.equal("test query");
});

Then("matching results should be displayed in the UI", () => {
  const results = webviewProvider.getSearchResults();
  expect(results).to.not.be.empty;
});

Then("the navigation should update to the search results", () => {
  expect(navigationManager.isUpdatedToSearchResults()).to.be.true;
});

Then("the tree view should highlight matched items", () => {
  expect(treeProvider.areMatchedItemsHighlighted()).to.be.true;
});

// Scenario: Export Chat Command Integration

Given("a chat sequence is selected in the UI", async () => {
  await webviewProvider.selectChatSequence("testChatId");
  expect(webviewProvider.getSelectedChatSequenceId()).to.equal("testChatId");
});

When("the export command is triggered", async () => {
  const args: ExportCommandArgs = { type: "export" };
  await commandManager.executeCommand("browsechat.exportChat", args);
});

Then("the data model should prepare the chat data", () => {
  expect(dataModelManager.isChatDataPreparedForExport("testChatId")).to.be.true;
});

Then("the file system should create an export file", () => {
  expect(TestHelper.isExportFileCreated("testChatId")).to.be.true;
});

Then("the UI should show export progress", () => {
  expect(webviewProvider.isExportProgressShown()).to.be.true;
});

Then("success notification should be shown", () => {
  expect(webviewProvider.isSuccessNotificationShown()).to.be.true;
});

// Scenario: Jump to Chat Command Integration

Given("multiple chat sequences are loaded", async () => {
  await dataModelManager.loadChatSequences();
  expect(dataModelManager.areChatSequencesLoaded()).to.be.true;
});

When("the jump to chat command is triggered with a specific ID", async (chatId: string) => {
  const args: JumpCommandArgs = { type: "jump", chatId };
  await commandManager.executeCommand("browsechat.jumpToChat", args);
});

Then("the navigation manager should locate the chat", () => {
  expect(navigationManager.getLocatedChatId()).to.equal("specificChatId");
});

Then("the UI should scroll to the target chat", () => {
  expect(webviewProvider.isChatScrolledIntoView("specificChatId")).to.be.true;
});

Then("the tree view should select the target item", () => {
  expect(treeProvider.isItemSelected("specificChatId")).to.be.true;
});

Then("the webview should highlight the target segment", () => {
  expect(webviewProvider.isChatHighlighted("specificChatId")).to.be.true;
});

// Scenario: Filter Command Integration

Given("chat data is displayed in the webview", async () => {
  await webviewProvider.displayChatData();
  expect(webviewProvider.isChatDataDisplayed()).to.be.true;
});

When("the filter command is executed with criteria", async () => {
  const args: FilterCommandArgs = { type: "filter", pattern: "test" };
  await commandManager.executeCommand("browsechat.filter", args);
});

Then("the data model should apply the filter", () => {
  expect(dataModelManager.isFilterApplied("test")).to.be.true;
});

Then("the UI should update to show filtered results", () => {
  expect(webviewProvider.isFilteredResultsDisplayed()).to.be.true;
});

Then("the navigation state should preserve filter context", () => {
  expect(navigationManager.isFilterContextPreserved()).to.be.true;
});

Then("the tree view should reflect filtered state", () => {
  expect(treeProvider.isFilteredStateDisplayed()).to.be.true;
});

// Scenario: Command Error Handling Integration

Given("a command execution environment", () => {
  expect(commandManager).to.not.be.undefined;
  expect(dataModelManager).to.not.be.undefined;
  expect(webviewProvider).to.not.be.undefined;
  expect(treeProvider).to.not.be.undefined;
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

Then("the data model should not be corrupted", () => {
  expect(dataModelManager.isConsistent()).to.be.true;
});

Then("error telemetry should be logged", () => {
  expect(TestHelper.getLastTelemetryEvent()).to.include({
    eventName: "commandFailure",
    command: "browsechat.nonexistentCommand"
  });
});

// Scenario: Command State Synchronization

Given("multiple VSCode windows are open", async () => {
  await TestHelper.simulateMultipleWindows();
});

When("commands modify the extension state", async () => {
  const args: FilterCommandArgs = { type: "filter", pattern: "test" };
  commandManager.executeCommand("browsechat.filter", args);
});

Then("all windows should reflect the changes", () => {
  const windows = TestHelper.getAllWindows();
  windows.forEach(window => {
    expect(window.hasStateChanged()).to.be.true;
  });
});

Then("the data model should maintain consistency", () => {
  expect(dataModelManager.isConsistent()).to.be.true;
});

Then("the UI should update across windows", () => {
  const windows = TestHelper.getAllWindows();
  windows.forEach(window => {
    expect(window.isUIUpdated()).to.be.true;
  });
});

Then("the navigation state should be synchronized", () => {
  const windows = TestHelper.getAllWindows();
  const navigationStates = windows.map(window => window.getNavigationState());
  const firstState = navigationStates[0];
  navigationStates.forEach(state => {
    expect(state).to.deep.equal(firstState);
  });
});

// Scenario: Command Integration with Settings

Given("user settings are configured", async () => {
  await TestHelper.configureUserSettings(context);
});

When("commands are executed with custom settings", async () => {
  await commandManager.executeCommand("browsechat.customCommand", { customSetting: true });
});

Then("the command behavior should respect settings", () => {
  const commandBehavior = TestHelper.getCommandBehavior();
  expect(commandBehavior).to.include({ customSetting: true });
});

Then("the UI should reflect configured preferences", () => {
  const uiPreferences = TestHelper.getUIPreferences();
  expect(uiPreferences).to.include({ customSetting: true });
});

Then("the data model should apply setting constraints", () => {
  const dataModelConstraints = TestHelper.getDataModelConstraints();
  expect(dataModelConstraints).to.include({ customSetting: true });
});

Then("settings should persist across sessions", async () => {
  await TestHelper.reloadExtension(context);
  const persistedSettings = TestHelper.getPersistedSettings();
  expect(persistedSettings).to.include({ customSetting: true });
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

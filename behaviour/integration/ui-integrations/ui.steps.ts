import { Given, When, Then, Before } from "@cucumber/cucumber";
import { expect } from "chai";
import type * as vscode from "vscode";
import { ChatWebViewProvider } from "@ui/ChatWebViewProvider";
import { ChatTreeProvider } from "@ui/ChatTreeProvider";
import { ChatNavigationManager } from "@ui/ChatNavigationManager";
import { SearchManager } from "@ui/SearchManager";
import { DataModelManager } from "@models/DataModelManager";
import { TestHelper } from "./ui.helper";
import { Uri, window as VSCodeWindow, CancellationTokenSource } from "vscode";

let context: vscode.ExtensionContext;
let webviewProvider: ChatWebViewProvider;
let treeProvider: ChatTreeProvider;
let navigationManager: ChatNavigationManager;
let searchManager: SearchManager;
let dataModelManager: DataModelManager;

Before(async () => {
  context = await TestHelper.createVSCodeContext();
  dataModelManager = new DataModelManager();
  webviewProvider = new ChatWebViewProvider(
    context.extensionUri,
    dataModelManager
  );
  treeProvider = new ChatTreeProvider(dataModelManager);
  navigationManager = new ChatNavigationManager(dataModelManager, context);
  searchManager = new SearchManager(dataModelManager, context);
});

Given("the VSCode extension context is initialized", () => {
  expect(context).to.not.be.undefined;
  expect(context.subscriptions).to.be.an("array");
});

Given("the webview provider is registered", () => {
  expect(webviewProvider).to.not.be.undefined;
  VSCodeWindow.registerWebviewViewProvider("chatBrowser", webviewProvider);
});

Given("the treeview provider is registered", () => {
  expect(treeProvider).to.not.be.undefined;
  VSCodeWindow.createTreeView("chatExplorer", {
    treeDataProvider: treeProvider,
  });
});

Given("the chat browser webview is created", async () => {
  const webviewView = TestHelper.createWebviewView();
  // eslint-disable-next-line max-len
  await webviewProvider.resolveWebviewView(
    webviewView,
    { state: undefined },
    new CancellationTokenSource().token
  );
});

When("the webview is initialized", () => {
  expect(webviewProvider.isInConsistentState()).to.be.true;
});

Then("the webview should have message handlers", () => {
  expect(webviewProvider.hasMessageHandlers()).to.be.true;
});

Given("a chat sequence is loaded", async () => {
  await TestHelper.loadTestChatSequence(dataModelManager);
});

When("the chat sequence is displayed", async () => {
  await webviewProvider.refresh();
});

Then("the webview should show the chat content", () => {
  expect(webviewProvider.getWebview()).to.not.be.undefined;
});

Given("navigation controls are enabled", async () => {
  await TestHelper.enableNavigation(navigationManager);
});

When("navigating to a specific chat", async () => {
  await navigationManager.navigateTo("testChat");
});

Then("the webview should scroll to the chat", () => {
  const scrollPos = webviewProvider.getCurrentScrollPosition();
  expect(scrollPos).to.be.greaterThan(0);
});

Given("search is enabled", async () => {
  await searchManager.activate();
});

When("performing a search", async () => {
  await searchManager.search(
    "test",
    { caseSensitive: false },
    new CancellationTokenSource().token
  );
});

Then("search results should be highlighted", () => {
  const searchResults = searchManager.getSearchResults();
  expect(searchResults).to.not.be.empty;
});

Given("theme customization is enabled", async () => {
  await TestHelper.enableThemeCustomization(webviewProvider);
});

When("changing the theme", async () => {
  await TestHelper.changeTheme("dark");
});

Then("the webview should update styles", () => {
  const styles = webviewProvider.getCurrentStyles();
  expect(styles).to.include("dark-theme");
});

Given("error handling is configured", async () => {
  await TestHelper.configureErrorHandling(webviewProvider);
});

When("an error occurs", async () => {
  await TestHelper.simulateError("Test error");
});

Then("the error should be handled gracefully", () => {
  const errorState = TestHelper.getLastErrorState();
  expect(errorState.handled).to.be.true;
});

Given("the extension is configured for cleanup", async () => {
  await TestHelper.configureCleanup(context);
});

When("the extension is deactivated", async () => {
  await TestHelper.deactivateExtension(context);
});

Then("component states should be saved", async () => {
  const savedState = await TestHelper.getSavedState();
  expect(savedState).to.not.be.empty;
});

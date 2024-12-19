import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { ExtensionWorld } from '../support/world';

Given('the chat browser is open', async function(this: ExtensionWorld) {
    await vscode.commands.executeCommand('browsechat.openChatBrowser');
    // Wait for webview to be ready
    await this.waitForWebview();
});

When('I click on chat segment {int}', async function(this: ExtensionWorld, segmentIndex: number) {
    await this.clickChatSegment(segmentIndex);
});

Then('the webview should display the chat content', async function(this: ExtensionWorld) {
    const webviewContent = await this.getWebviewContent();
    expect(webviewContent).to.not.be.empty;
});

Then('syntax highlighting should be applied', async function(this: ExtensionWorld) {
    const webviewContent = await this.getWebviewContent();
    expect(webviewContent).to.include('class="hljs"');
});

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { ExtensionWorld } from '../support/world';

Given('VSCode is running', async function(this: ExtensionWorld) {
    expect(vscode.window).to.exist;
    this.context = await this.activateExtension();
});

Given('the BrowseChat extension is activated', async function(this: ExtensionWorld) {
    if (!this.context) {
        this.context = await this.activateExtension();
    }
    expect(this.context).to.exist;
    expect(this.context.subscriptions).to.have.length.above(0);
});

When('I open a chat log file {string}', async function(this: ExtensionWorld, filePath: string) {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);
    this.activeDocument = document;
    await vscode.window.showTextDocument(document);
});

Then('the extension should be in an active state', function(this: ExtensionWorld) {
    expect(this.context).to.exist;
    expect(this.context?.subscriptions).to.have.length.above(0);
});

Then('I should see the chat browser view', async function(this: ExtensionWorld) {
    // Wait for webview panel to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const panels = vscode.window.visibleTextEditors;
    expect(panels).to.exist;
    
    // Check if our webview panel exists
    const webViewType = await vscode.commands.executeCommand('browsechat._internal.getWebviewType');
    expect(webViewType).to.equal('chatBrowser');
});

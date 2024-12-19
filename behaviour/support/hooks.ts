import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import * as vscode from 'vscode';
import { ExtensionWorld } from './world';

BeforeAll(async function() {
    // Global setup before all tests
    console.log('Starting BDD test suite');
});

Before(async function(this: ExtensionWorld) {
    // Setup before each scenario
    try {
        this.context = await this.activateExtension();
    } catch (error) {
        console.error('Failed to activate extension:', error);
        throw error;
    }
});

After(async function(this: ExtensionWorld) {
    // Cleanup after each scenario
    if (this.activeDocument) {
        await vscode.window.showTextDocument(this.activeDocument, { preview: false, preserveFocus: false });
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }
    this.parsedSegments = [];
    this.messageCount = 0;
});

AfterAll(async function() {
    // Global cleanup after all tests
    console.log('Completed BDD test suite');
});

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { ExtensionWorld } from '../support/world';

Given('I have a chat log file with {int} messages', async function(this: ExtensionWorld, messageCount: number) {
    this.messageCount = messageCount;
    // Setup mock chat log file
});

When('the parser processes the file', async function(this: ExtensionWorld) {
    // Trigger parser
    await this.parseCurrentFile();
});

Then('it should identify {int} chat segments', function(this: ExtensionWorld, expectedCount: number) {
    expect(this.parsedSegments.length).to.equal(expectedCount);
});

Then('each segment should have valid metadata', function(this: ExtensionWorld) {
    for (const segment of this.parsedSegments) {
        expect(segment).to.have.property('id');
        expect(segment).to.have.property('startIndex');
        expect(segment).to.have.property('endIndex');
        expect(segment).to.have.property('content');
    }
});

// The module 'vscode' contains the VS Code extensibility API Import the module and reference it with the alias vscode
// in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Debug logging to show activation
	console.log('Activating BrowseChat extension...');

	try {
		// The command has been defined in the package.json file
		let disposable = vscode.commands.registerCommand('browsechat.helloWorld', () => {
			console.log('Executing browsechat.helloWorld command');
			vscode.window.showInformationMessage('Hello from BrowseChat!');
		});

		context.subscriptions.push(disposable);
		console.log('BrowseChat extension activated successfully!');
		
		// List all available commands for debugging
		vscode.commands.getCommands(true).then(commands => {
			console.log('Available commands:', commands.filter(cmd => cmd.startsWith('browsechat')));
		});

	} catch (error) {
		console.error('Error activating BrowseChat extension:', error);
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('BrowseChat extension is being deactivated');
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { AiderInterface } from './aiderInterface';
import { AiderWebview } from './aiderWebview';
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "aider-code" is now active!');

	// Get the current working directory based on the project's current directory
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const workingDirectory = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';

	// Create an instance of AiderInterface
	const aiderInterface = new AiderInterface(workingDirectory);

	// Register the command to launch the Aider webview
	const webviewDisposable = vscode.commands.registerCommand('aider-code.openAiderChat', () => {
		new AiderWebview(context, aiderInterface);
	});
	context.subscriptions.push(webviewDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

import * as vscode from 'vscode';
import { AiderInterface } from './aiderInterface';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

export class AiderWebview {
    private panel: vscode.WebviewPanel;
    private aiderInterface: AiderInterface;
    private commandHistory: string[] = [];
    private debugLogEntries: string[] = []; // Store debug log entries

    constructor(context: vscode.ExtensionContext, aiderInterface: AiderInterface) {
        this.aiderInterface = aiderInterface;
        this.panel = vscode.window.createWebviewPanel(
            'aiderWebview',
            'Aider Webview',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'media')]
            }
        );

        this.panel.webview.html = this.getWebviewContent(context.extensionUri);

        this.panel.webview.onDidReceiveMessage(
            message => {
                Logger.log(`Chat sent message: ${JSON.stringify(message)}`);
                switch (message.command) {
                    case 'sendCommand':
                        this.sendCommandToAider(message.type, message.text);
                        return;
                    case 'promptUserResponse':
                        this.promptUserResponse(message.response);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        // Set the panel for the Logger and send stored logs
        Logger.setPanel(this.panel);

        // Send stored logs to the webview
        this.sendStoredLogs();

        this.aiderInterface.setWebview(this);

        // Restore chat history and debug log when the panel is shown
        this.panel.onDidChangeViewState(e => {
            if (e.webviewPanel.visible) {
                this.restoreChatHistory();
                this.restoreDebugLog();
                this.aiderInterface.setWebview(this); // Reattach AiderInterface
            }
        });
    }

    private sendStoredLogs() {
        const storedLogs = Logger.getStoredLogs();
        storedLogs.forEach(log => {
            this.debugLogEntries.push(log); // Store debug log entries
            this.panel.webview.postMessage({
                command: 'log',
                text: log
            });
        });
    }

    public updateChatHistory(text: string): void {
        this.panel.webview.postMessage({
            command: 'updateChatHistory',
            text: text
        });
    }

    public restoreChatHistory(): void {
        // Get chat history from AiderInterface and replay it
        const history = this.aiderInterface.getChatHistory();
        history.forEach(msg => {
            if (msg.type === 'output') {
                this.updateChatHistory(msg.message);
            } else if (msg.type === 'assistant') {
                this.updateChatHistoryAssistant({
                    message: msg.message,
                    fileName: msg.fileName || '',
                    diff: msg.diff || ''
                });
            }
            // Skip prompts that were already answered
        });
    }

    public restoreDebugLog(): void {
        this.debugLogEntries.forEach(entry => {
            this.panel.webview.postMessage({
                command: 'log',
                text: entry
            });
        });
    }

    public updateChatHistoryAssistant(info: { message: string; fileName: string; diff: string }): void {
        this.panel.webview.postMessage({
            command: 'updateChatHistoryAssistant',
            text: info.message,
            fileName: info.fileName,
            diff: info.diff
        });
    }

    public respondToQuestion(question: string) {
        if (!this.panel) return;
    
        // Add user message
        this.panel.webview.postMessage({ 
            command: 'addUserMessage', 
            text: question 
        });
    
        // Simulate processing time
        setTimeout(() => {
            // Add response (you'd replace this with actual logic to generate responses)
            const response = `Here's information about "${question}" in CSS...`;
            this.panel.webview.postMessage({ 
                command: 'addResponse', 
                text: response 
            });
        }, 1000);
    }

    public promptUser(message: string, defaultValue: string, subject:string): void {
        this.panel.webview.postMessage({
            command: 'promptUser',
            text: message,
            defaultValue: defaultValue,
            subject: subject
        });
    }

    private promptUserResponse(response: string): void {
        Logger.log(`Received ${response} response from user`);
        this.aiderInterface.promptUserResponse(response);
    }

    private getWebviewContent(extensionUri: vscode.Uri): string {
        const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'aiderWebview.html');
        const cssPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'styles.css');
        const scriptPath = vscode.Uri.joinPath(extensionUri, 'src', 'media', 'aiderWebview.js');

        const htmlUri = this.panel.webview.asWebviewUri(htmlPath);
        const cssUri = this.panel.webview.asWebviewUri(cssPath);
        const scriptUri = this.panel.webview.asWebviewUri(scriptPath);

        let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
        html = html.replace('${cssUri}', cssUri.toString());
        html = html.replace('${scriptUri}', scriptUri.toString());

        return html;
    }

    private async sendCommandToAider(command: string, value: string) {
        Logger.log(`Send command to AiderInterface: ${command}`);
        if (command === 'user') {
            this.commandHistory.push(value);
        }
        this.aiderInterface.sendCommand(command, value);
//        try {
//            const response = await this.aiderInterface.sendCommand(command);
//            Logger.log(`Received response from Aider: ${response}`);
//            this.updateChatHistory(response);
//        } catch (error) {
//            if (error instanceof Error) {
//                Logger.log(`Error from Aider: ${error.message}`);
//            } else {
//                Logger.log(`Unknown error from Aider`);
//            }
//        }
    }
}

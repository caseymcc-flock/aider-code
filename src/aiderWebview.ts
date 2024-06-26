import * as vscode from 'vscode';
import { AiderInterface } from './aiderInterface';

export class AiderWebview {
    private panel: vscode.WebviewPanel;
    private aiderInterface: AiderInterface;
    private commandHistory: string[] = [];

    constructor(context: vscode.ExtensionContext, aiderInterface: AiderInterface) {
        this.aiderInterface = aiderInterface;
        this.panel = vscode.window.createWebviewPanel(
            'aiderWebview',
            'Aider Webview',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        this.panel.webview.html = this.getHtmlContent();

        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendCommand':
                        this.sendCommandToAider(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    }

    private getHtmlContent(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Aider Webview</title>
                <style>
                    .collapsible {
                        display: flex;
                        align-items: center;
                        padding: 5px 0;
                    }
                    .collapsible::before {
                        content: "▼";
                        padding-right: 5px;
                        color: #fff;
                    }
                </style>
            </head>
            <body>
                <div id="files" class="collapsible" onclick="toggleFiles()">Files
                    <div id="files-container" style="display: none; max-height: 100px; overflow-y: auto;">
                        <ul id="file-list" style="max-height: 5em; overflow-y: auto;"></ul>
                    </div>
                </div>
                <div id="chat-view">
                    <h2>Command History</h2>
                    <ul id="command-history"></ul>
                </div>
                <div id="chat-input">
                    <h2>Send Command</h2>
                    <input type="text" id="command-input" />
                    <button onclick="sendCommand()">Send</button>
                </div>
                <script>
                    function toggleFiles() {
                        const fileContainer = document.getElementById('files-container');
                        if (fileContainer.style.display === 'none') {
                            fileContainer.style.display = 'block';
                        } else {
                            fileContainer.style.display = 'none';
                        }
                    }
                    const vscode = acquireVsCodeApi();

                    function sendCommand() {
                        const input = document.getElementById('command-input');
                        vscode.postMessage({
                            command: 'sendCommand',
                            text: input.value
                        });
                        input.value = '';
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'updateCommandHistory':
                                updateCommandHistory(message.text);
                                break;
                        }
                    });

                    function updateCommandHistory(text) {
                        const history = document.getElementById('command-history');
                        const li = document.createElement('li');
                        li.textContent = text;
                        history.appendChild(li);
                    }
                </script>
            </body>
            </html>
        `;
    }

    private sendCommandToAider(command: string) {
        this.commandHistory.push(command);
        this.aiderInterface.sendCommand(command);
        this.panel.webview.postMessage({
            command: 'updateCommandHistory',
            text: command
        });
    }
}

import * as vscode from 'vscode';

export class AiderInterface {
    private terminal: vscode.Terminal;

    constructor() {
        this.terminal = vscode.window.createTerminal('Aider Terminal');
        this.terminal.sendText('aider');
        this.terminal.show();
        this.terminal.processId.then(pid => {
            const pty = (vscode as any).window.createTerminalRenderer('Aider Terminal');
            pty.onDidWriteData((data: string) => {
                this.handleTerminalOutput(data);
            });
        });
        this.terminal.processId.then(pid => {
            const pty = (vscode as any).window.createTerminalRenderer('Aider Terminal');
            pty.onDidWriteData((data: string) => {
                this.handleTerminalOutput(data);
            });
        });
    }

    private handleTerminalOutput(data: string): void {
        if (data.includes('No git repo found, create one to track GPT\'s changes (recommended)')) {
            vscode.window.showInformationMessage(
                'No git repo found, create one to track GPT\'s changes (recommended)',
                'Yes',
                'No'
            ).then(selection => {
                if (selection === 'Yes') {
                    this.terminal.sendText('y');
                } else if (selection === 'No') {
                    this.terminal.sendText('n');
                }
            });
        }
    }
    }

    private handleTerminalOutput(data: string): void {
        if (data.includes('No git repo found, create one to track GPT\'s changes (recommended)')) {
            vscode.window.showInformationMessage(
                'No git repo found, create one to track GPT\'s changes (recommended)',
                'Yes',
                'No'
            ).then(selection => {
                if (selection === 'Yes') {
                    this.terminal.sendText('y');
                } else if (selection === 'No') {
                    this.terminal.sendText('n');
                }
            });
        }

    public sendCommand(command: string): void {
        this.terminal.sendText(command);
    }

    public closeTerminal(): void {
        this.terminal.dispose();
    }
}

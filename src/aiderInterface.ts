import * as vscode from 'vscode';

export class AiderInterface {
    private terminal: vscode.Terminal;

    constructor() {
        this.terminal = vscode.window.createTerminal('Aider Terminal');
        this.terminal.sendText('aider');
        this.terminal.show();
        this.terminal.processId.then(pid => {
            const pty = require('node-pty').spawn('sh', [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: process.env.HOME,
                env: process.env
            });

            pty.on('data', (data: string) => {
                this.handleTerminalOutput(data);
            });
        });
    }

    private handleTerminalOutput(data: string): void {
        const handlers = [
            {
                searchString: 'No git repo found, create one to track GPT\'s changes (recommended)',
                handler: this.handleNoGitRepo.bind(this)
            }
        ];

        for (const { searchString, handler } of handlers) {
            if (data.includes(searchString)) {
                handler();
                break;
            }
        }
    }

    private handleNoGitRepo(): void {
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

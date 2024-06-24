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
        this.terminal.processId.then(pid => {
            const pty = (vscode as any).window.createTerminalRenderer('Aider Terminal');
            pty.onDidWriteData((data: string) => {
                this.handleTerminalOutput(data);
            });
        });
    }


    }


    public sendCommand(command: string): void {
        this.terminal.sendText(command);
    }

    public closeTerminal(): void {
        this.terminal.dispose();
    }
}

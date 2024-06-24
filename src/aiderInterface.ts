import * as vscode from 'vscode';

export class AiderInterface {
    private terminal: vscode.Terminal;

    constructor() {
        this.terminal = vscode.window.createTerminal('Aider Terminal');
        this.terminal.sendText('aider');
        this.terminal.show();
    }

    public sendCommand(command: string): void {
        this.terminal.sendText(command);
    }

    public closeTerminal(): void {
        this.terminal.dispose();
    }
}

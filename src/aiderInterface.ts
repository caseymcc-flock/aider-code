import * as vscode from 'vscode';

export class AiderInterface {
    private terminal: vscode.Terminal;
    private workingDirectory: string = '';

    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;

        let terminalOptions: vscode.TerminalOptions =  {
            'name': 'Aider Terminal',
            'cwd': '/Users/username/Documents/aider-code',
        };

        if (process.platform === 'win32') {
            terminalOptions['shellPath'] = 'cmd.exe';
            terminalOptions['shellArgs'] = ['/k', 'cd ' + this.workingDirectory];
        }

        this.terminal = vscode.window.createTerminal('Aider Terminal');
        this.terminal.sendText('aider');
        this.terminal.show();
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

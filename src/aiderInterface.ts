import * as vscode from 'vscode';
import * as pty from 'node-pty';

export class AiderInterface {
    private process: pty.IPty;
    private outputChannel: vscode.OutputChannel;
    private workingDirectory: string = '';

    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;

        this.outputChannel = vscode.window.createOutputChannel('Aider Interface');                                                                           
        this.outputChannel.appendLine(`Starting in ${this.workingDirectory}...`);
        
        try {
            this.process = pty.spawn('aider', [], {
                name: 'xterm-256color',
                cwd: this.workingDirectory,
                env: { ...process.env, TERM: 'xterm-256color' } as { [key: string]: string }
            });

            this.process.onData((data) => {
                this.handleTerminalOutput(data);
            });

            this.process.onExit((exitCode) => {
                this.outputChannel.appendLine(`child process exited with code ${exitCode.exitCode}`);
            });

            this.outputChannel.appendLine('Process started successfully.');
        } catch (error) {
            this.outputChannel.appendLine(`Error starting process: ${error}`);
        }
    }

    private handleTerminalOutput(data: string): void {
        const handlers = [
            {
                searchString: 'No git repo found, create one to track GPT\'s changes (recommended)',
                handler: this.handleNoGitRepo.bind(this)
            }
        ];

        this.outputChannel.appendLine(`Received: ${data}`);

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
                this.sendCommand('y');
            } else if (selection === 'No') {
                this.sendCommand('n');
            }
        });
    }

    public sendCommand(command: string): void {
        this.outputChannel.appendLine(`Sent: ${command}`);
        this.process.write(`${command}\n`);  
    }

    public closeTerminal(): void {
        this.outputChannel.appendLine('Process terminated.');
        this.process.kill();
    }
}

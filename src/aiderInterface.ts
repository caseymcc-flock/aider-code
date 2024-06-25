import * as vscode from 'vscode';
import * as pty from 'node-pty';

export class AiderInterface {
    private process: ChildProcessWithoutNullStreams;
    private outputChannel: vscode.OutputChannel;
    private workingDirectory: string = '';

    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;

        this.outputChannel = vscode.window.createOutputChannel('Aider Interface');                                                                           
        this.outputChannel.appendLine(`Starting in ${this.workingDirectory}...`);
        this.process = spawn('aider', [], { cwd: this.workingDirectory, stdio: ['pipe', 'pipe', 'pipe'] });

        this.process.stdout.on('data', (data) => {
             this.handleTerminalOutput(data.toString());
        });

        this.process.stderr.on('data', (data) => {
            const errorOutput = data.toString();
            this.outputChannel.appendLine(`Error: ${errorOutput}`);
            console.error(`stderr: ${errorOutput}`);
        });

        this.process.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
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
        this.process.stdin.write(`${command}\n`);
    }

    public closeTerminal(): void {
        this.outputChannel.appendLine('Process terminated.');
        this.process.kill();
    }
}

import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

export class AiderInterface {
    private process: ChildProcessWithoutNullStreams;
    private workingDirectory: string = '';

    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;

        this.process = spawn('aider', [], { cwd: this.workingDirectory });

        this.process.stdout.on('data', (data) => {
            this.handleTerminalOutput(data.toString());
        });

        this.process.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
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
                this.process.stdin.write('y\n');
            } else if (selection === 'No') {
                this.process.stdin.write('n\n');
            }
        });
    }

    public sendCommand(command: string): void {
        this.process.stdin.write(`${command}\n`);
    }

    public closeTerminal(): void {
        this.process.kill();
    }
}

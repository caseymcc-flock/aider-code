import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import { AiderWebview } from './aiderWebview';
import { Logger } from './logger';
import { parse } from 'path';

export class AiderInterface {
    private outputChannel: vscode.OutputChannel;
    private workingDirectory: string = '';
    private webview?: AiderWebview;
    private process: any;

    constructor(workingDirectory: string) {
        this.workingDirectory = workingDirectory;

        this.outputChannel = vscode.window.createOutputChannel('Aider Interface');
        Logger.log(`Starting in ${this.workingDirectory}...`);

        try {
            this.process = spawn('aider', ['--commandio', '--no-stream'], {
                cwd: this.workingDirectory
            });

            this.process.stdout.on('data', (data: string) => {
                this.handleTerminalOutput(data);
            });

            this.process.stderr.on('data', (data: string) => {
                this.handleTerminalOutput(data);
            });

            this.process.on('error', (error: any) => {
                Logger.log(`Failed to start the process ${error}`);
            });

            this.process.on('close', (exitCode: any) => {
                Logger.log(`child process exited with code ${exitCode}`);
            });
        }
        catch (error) {
            Logger.log(`Error starting process: ${error}`);
        }
        Logger.log(`Aider started`);
    }

    public setWebview(webview: AiderWebview): void {
        this.webview = webview;
    }

    private handleTerminalOutput(data: string): void {
        Logger.log(`Received: ${data}`);

        try {
            const parsedData = JSON.parse(data);

            if (parsedData.cmd === "output") {
                this.updateChatHistoryOutput(parsedData.value);
            } else if (parsedData.cmd === "assistant") {
                const response = parsedData.value;
                const unescapedResponse = response.replace(/\\\"/g, '\"'); // Unescape quotes
                const [message, fileName, diff] = this.parseResponse(unescapedResponse);

                Logger.log(`Assistant response:`);
                Logger.log(`  message: ${message}`);
                Logger.log(`  fileName: ${fileName}`);
                Logger.log(`  diff: ${diff}`);

                this.updateChatHistoryAssistant({ message, fileName, diff });
            }
            if (parsedData.cmd === "prompt") {
                if (this.webview) {
                    this.webview.promptUser(parsedData.value, parsedData.default, parsedData.subject);
                }
            }
        } catch (error) {
            Logger.log(`Error parsing data: ${error}`);
        }
    }

    private updateChatHistoryOutput(message: string): void {
        if (this.webview) {
            this.webview.updateChatHistory(message);
        }
    }

    private updateChatHistoryAssistant(info: { message: string; fileName: string; diff: string }): void {
        if (this.webview) {
            this.webview.updateChatHistoryAssistant(info);
        }
    }

    private parseResponse(response: string): [string, string, string] {
        const parts = response.split(/\n+/);
        const message = parts[0].replace(/\\\"/g, '\"');
        const fileName = parts[1] || '';
        const diff = parts.slice(2).join('\n').replace(/```diff\n/g, '').replace(/```/g, '').trim();
        return [message, fileName, diff];
    }

    public promptUserResponse(response: string): void {
        const jsonCommand = JSON.stringify({
            cmd: "prompt_response",
            value: response
        });
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
        const jsonCommand = JSON.stringify({
            cmd: "user",
            value: command
        });

        Logger.log(`Sent: ${jsonCommand}`);

        this.process.stdin.write(`${jsonCommand}\n`);
    }

    public closeTerminal(): void {
        Logger.log('Process terminated.');
        this.process.kill();
    }
}

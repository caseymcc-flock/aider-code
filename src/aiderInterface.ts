import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import { AiderWebview } from './aiderWebview';
import { Logger } from './logger';

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
                cwd: this.workingDirectory,
                stdio: 'inherit' // Updated to inherit stdio from the parent process
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
        Logger.log(`Received: <${data}>`);

        // Split the incoming data by new lines and process each line
        const lines = data.split(/\r?\n/); // Updated to handle different line endings

        for (const line of lines) {
            Logger.log(`Processing: ${line}`);

            if (line.trim() === '') 
            {   continue; }// Skip empty lines
            
            try {
                const parsedData = JSON.parse(line);
                Logger.log(`Parsed data: ${JSON.stringify(parsedData)}`); // Added logging for parsed data

                if (parsedData.cmd === "output") {
                    Logger.log(`Output: ${parsedData.value}`);
                    this.updateChatHistoryOutput(parsedData.value);
                } else if (parsedData.cmd === "assistant") {
                    const response = parsedData.value;
                    const unescapedResponse = JSON.parse(response); // Using JSON.parse to unescape
                    const [message, fileName, diff] = this.parseResponse(unescapedResponse);

                    Logger.log(`Assistant response:`);
                    Logger.log(`  message: ${message}`);
                    Logger.log(`  fileName: ${fileName}`);
                    Logger.log(`  diff: ${diff}`);

                    this.updateChatHistoryAssistant({ message, fileName, diff });
                }
                if (parsedData.cmd === "prompt") {
                    Logger.log(`Prompt:`);
                    Logger.log(`  message: ${parsedData.value}`);
                    Logger.log(`  default: ${parsedData.default}`);
                    Logger.log(`  subject: ${parsedData.subject}`);
                    if (this.webview) {
                        this.webview.promptUser(parsedData.value, parsedData.default, parsedData.subject);
                    }
                }
            } catch (error) {
                Logger.log(`Error parsing data: ${error}`);
            }
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
        const message = parts[0];
        const fileName = parts[1] || '';
        const diff = parts.slice(2).join('\n').replace(/```diff\n/g, '').replace(/```/g, '').trim();
        return [message, fileName, diff];
    }

    public promptUserResponse(response: string): void {
        this.sendCommand("prompt_response", response);
    }

    private handleNoGitRepo(): void {
        vscode.window.showInformationMessage(
            'No git repo found, create one to track GPT\'s changes (recommended)',
            'Yes',
            'No'
        ).then(selection => {
            if (selection === 'Yes') {
                this.sendCommand('prompt_response', 'y');
            } else if (selection === 'No') {
                this.sendCommand('prompt_response', 'n');
            }
        });
    }

    public sendCommand(command: string, value: string): void {
        const jsonCommand = JSON.stringify({
            cmd: command,
            value: value
        });

        Logger.log(`Sent: ${jsonCommand}`);

        this.process.stdin.write(`${jsonCommand}\n`);
    }

    public closeTerminal(): void {
        Logger.log('Process terminated.');
        this.process.kill();
    }
}

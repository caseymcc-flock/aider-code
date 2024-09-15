import * as vscode from 'vscode';
import {exec, spawn} from 'child_process';
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
                if (this.webview) {
                    this.webview.updateChatHistory(parsedData.value);
                }
            }
            if (parsedData.cmd === "assistant") {
                if (this.webview) {
                    this.webview.updateChatHistory(parsedData.value);
                }
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

//    public sendCommand(command: string): Promise<string> {
//        return new Promise((resolve, reject) => {
//            Logger.log(`Sent: ${command}`);
//            this.process.stdin.write(`${command}\n`);
//
//            const responseHandler = (data: Buffer) => {
//                const response = data.toString();
//                Logger.log(`Received: ${response}`);
//                this.process.stdout.removeListener('data', responseHandler);
//                resolve(response);
//            };
//
//            this.process.stdout.on('data', responseHandler);
//
//            // Add a timeout to prevent hanging
//            setTimeout(() => {
//                this.process.stdout.removeListener('data', responseHandler);
//                reject(new Error('Command timed out'));
//            }, 10000); // 10 seconds timeout
//        });
//    }

    public closeTerminal(): void {
        Logger.log('Process terminated.');
        this.process.kill();
    }
}

import * as vscode from 'vscode';
import {exec, spawn} from 'child_process';
import {AiderWebview} from './aiderWebview';
import {Logger} from './logger';

interface ChatMessage
{
    type: 'output'|'assistant'|'prompt'|'user';
    message: string;
    fileName?: string;
    diff?: string;
    defaultValue?: string;
    subject?: string;
    response?: string;
}

export class AiderInterface
{
    private outputChannel: vscode.OutputChannel;
    private workingDirectory: string='';
    private webview?: AiderWebview;
    private process: any;
    private chatHistory: ChatMessage[]=[];
    private answeredPrompts: Set<string>=new Set();
    private streamingMessage: boolean=false;

    constructor(workingDirectory: string)
    {
        this.workingDirectory=workingDirectory;

        this.outputChannel=vscode.window.createOutputChannel('Aider Interface');
        Logger.log(`Starting in ${this.workingDirectory}...`);

        try
        {
//            this.process=spawn('aider', ['--commandio', '--no-stream'], {
            this.process=spawn('aider', ['--commandio'], {
                cwd: this.workingDirectory,
            });

            if(this.process)
            {
                this.process.stdout.on('data', (data: string) =>
                {
                    this.handleTerminalOutput(data);
                });

                this.process.stderr.on('data', (data: string) =>
                {
                    this.handleTerminalOutput(data);
                });

                this.process.on('error', (error: any) =>
                {
                    Logger.log(`Failed to start the process ${error}`);
                });

                this.process.on('close', (exitCode: any) =>
                {
                    Logger.log(`child process exited with code ${exitCode}`);
                });
            } else
            {
                Logger.log(`Process could not be started.`);
            }
        }
        catch(error)
        {
            Logger.log(`Error starting process: ${error}`);
        }
        Logger.log(`Aider started`);
    }

    public setWebview(webview: AiderWebview): void
    {
        this.webview=webview;
    }

    private handleTerminalOutput(data: any): void
    {
        if(Buffer.isBuffer(data))
        {
            data=data.toString();
        }
        Logger.log(`Received: <${data}>`);

        const lines=data.split(/\r?\n/);

        for(const line of lines)
        {
            Logger.log(`Processing: ${line}`);

            if(line.trim()==='')
            {
                continue;
            }

            try
            {
                const parsedData=JSON.parse(line);
                Logger.log(`Parsed data: ${JSON.stringify(parsedData)}`);

                if(parsedData.cmd==="output")
                {
                    Logger.log(`Output: ${parsedData.value}`);
                    this.chatHistory.push({
                        type: 'output',
                        message: parsedData.value
                    });
                    this.updateChatHistoryOutput(parsedData.value);
                }
                else if(parsedData.cmd==="assistant")
                {
                    Logger.log(`Assistant response:`);
                    this.chatHistory.push({
                        type: 'assistant',
                        message: parsedData.value//,
                        //                        fileName: parsedData.filename,
                        //                        diff: parsedData.code
                    });
                    this.updateChatHistoryAssistant({
                        message: parsedData.value//, 
                        //                        fileName: parsedData.filename, 
                        //                        diff: parsedData.code 
                    });
                } 
                else if(parsedData.cmd==="assistant-stream")
                {
                   this.handleAssistantStream(parsedData);
                }
                else if(parsedData.cmd==="prompt")
                {
                    Logger.log(`Prompt:`);
                    const promptKey=`${parsedData.value}-${parsedData.subject}`;

                    if(!this.answeredPrompts.has(promptKey))
                    {
                        this.chatHistory.push({
                            type: 'prompt',
                            message: parsedData.value,
                            defaultValue: parsedData.default,
                            subject: parsedData.subject
                        });
                        if(this.webview)
                        {
                            this.webview.promptUser(parsedData.value, parsedData.default, parsedData.subject);
                        }
                    }
                }
            } catch(error)
            {
                Logger.log(`Error parsing data: ${error}`);
            }
        }
    }

    private handleAssistantStream(parsedData: any): void
    {
        Logger.log(`Assistant stream: ${parsedData.value} (final: ${parsedData.final})`);

        if(!parsedData.final)
        {
            this.webview?.updateStreamMessage(parsedData.value, false);
        }
        else
        {
            this.chatHistory[this.chatHistory.length-1]=
            {
                type: 'assistant',
                message: parsedData.value
            };
            this.webview?.updateStreamMessage(parsedData.value, true);
        }
    }

    private updateChatHistoryOutput(message: string): void
    {
        if(this.webview)
        {
            this.webview.updateChatHistory(message);
        }
    }

    //    private updateChatHistoryAssistant(info: { message: string; fileName: string; diff: string }): void {
    private updateChatHistoryAssistant(info: {message: string}): void
    {
        if(this.webview)
        {
            this.webview.updateChatHistoryAssistant(info);
        }
    }

    public userCommand(message: string): void 
    {
        this.chatHistory.push({
            type: 'user',
            message: message
        });
        this.updateChatHistoryOutput(message);

        this.sendCommand("user", message);
    }

    private parseResponse(response: string): [string, string, string]
    {
        const parts=response.split(/\n+/);
        const message=parts[0];
        const fileName=parts[1]||'';
        const diff=parts.slice(2).join('\n').replace(/```diff\n/g, '').replace(/```/g, '').trim();
        return [message, fileName, diff];
    }

    public promptUserResponse(response: string): void
    {
        // Find the last prompt in the chat history and add the response
        for(let i=this.chatHistory.length-1; i>=0; i--)
        {
            if(this.chatHistory[i].type==='prompt')
            {
                this.chatHistory[i].response=response;
                const promptKey=`${this.chatHistory[i].message}-${this.chatHistory[i].subject}`;
                this.answeredPrompts.add(promptKey);
                break;
            }
        }
        this.sendCommand("prompt_response", response);
    }

    private handleNoGitRepo(): void
    {
        vscode.window.showInformationMessage(
            'No git repo found, create one to track GPT\'s changes (recommended)',
            'Yes',
            'No'
        ).then(selection =>
        {
            if(selection==='Yes')
            {
                this.sendCommand('prompt_response', 'y');
            } else if(selection==='No')
            {
                this.sendCommand('prompt_response', 'n');
            }
        });
    }

   

    public sendCommand(command: string, value: string): void
    {
        const jsonCommand=JSON.stringify({
            cmd: command,
            value: value
        });

        Logger.log(`Sent: ${jsonCommand}`);

        this.process.stdin.write(`${jsonCommand}\n`);
    }

    public getChatHistory()
    {
        return this.chatHistory;
    }

    public closeTerminal(): void
    {
        Logger.log('Process terminated.');
        this.process.kill();
    }
}

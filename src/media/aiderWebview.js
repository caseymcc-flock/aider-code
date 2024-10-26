const vscode = acquireVsCodeApi();

const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const debugToggle = document.getElementById('debug-toggle');
const debugView = document.getElementById('debug-view');
const debugLog = document.getElementById('debug-log');

let lastMessageType = ''; // Track the last message type
let currentMessageDiv; // Track the current message div
let streamMessage;

document.addEventListener('DOMContentLoaded', () => 
{
    // Initialize markdown-it using the global markdownit function
    const md = window.markdownit(
        {
            html: true,
            linkify: true,
            highlight: function (str, lang) 
            {
                return `<pre class="language-\${lang}"><code>\${str}</code></pre>`;
            }
        });
});

function setHighlightJsTheme()
{
    //    const theme = vscode.getState().theme || 'default'; // Get the current theme from VSCode state
    //    const highlightJsTheme = theme === 'dark' ? 'dark' : 'default'; // Set highlight.js theme based on VSCode theme
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `./media/highlight/styles/${highlightJsTheme}.min.css`; // Load from local styles directory
}

function updateMessageBlock(type)
{
    if((lastMessageType === type) && currentMessageDiv)
    {return;}

    lastMessageType = type;
    currentMessageDiv = document.createElement('div');
    
    // Create header
    const header = document.createElement('div');
    header.className = 'message-header';
    
    // Create icon
    const icon = document.createElement('div');
    icon.className = 'message-icon';
    
    switch(type)
    {
        case 'user':
            currentMessageDiv.className = 'user-message-container';
            icon.className += ' user-icon';
            icon.innerHTML = '👤';
            break;
        case 'assistant':
            currentMessageDiv.className = 'assistant-message-container';
            icon.className += ' assistant-icon';
            icon.innerHTML = '🤖';
            break;
    }
    
    header.appendChild(icon);
    currentMessageDiv.appendChild(header);
    
    // Add divider
    const divider = document.createElement('hr');
    divider.className = 'message-divider';
    currentMessageDiv.appendChild(divider);
    
    chatHistory.appendChild(currentMessageDiv);
}

function addMessageToChat(type, message, html=false)
{
    updateMessageBlock(type);

    const messageElement = document.createElement('div');

    switch(type)
    {
        case 'user':
            messageElement.className = 'user-message';
            messageElement.textContent = message;
            break;
        case 'assistant':
            messageElement.className = 'aider-response';
            if(html)
            {   messageElement.innerHTML = message;}
            else
            {    messageElement.textContent = message;}
        
            break;
    }

    currentMessageDiv.appendChild(messageElement);

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addAssistantMessageToChat(message, fileName, diff, changeCount) 
{
    addMessageToChat('assistant', message); // Use the same function to add assistant messages
    //    const messageElement = currentMessageDiv.lastChild; // Get the last message element added
    //
    //    const collapsibleFileElement = document.createElement('div');
    //    collapsibleFileElement.className = 'collapsible-file';
    //
    //    const toggleIcon = document.createElement('span');
    //    toggleIcon.className = 'collapsible-icon';
    //    toggleIcon.textContent = '▼';
    //    toggleIcon.style.cursor = 'pointer';
    //
    //    const fileNameElement = document.createElement('p');
    //
    //    // Parse the diff to count additions and subtractions
    //    const additions = (diff.match(/\+/g) || []).length;
    //    const subtractions = (diff.match(/-/g) || []).length;
    //    fileNameElement.textContent = `File: ${fileName} (${changeCount} changes, +${additions}, -${subtractions})`;
    //
    //    const diffElement = document.createElement('pre');
    //    diffElement.className = 'code-diff';
    //    diffElement.innerHTML = `<code>diff\n${diff}\n</code>`; // Updated to wrap in <pre><code>
    //    diffElement.style.display = 'none'; // Start in a collapsed state
    //
    //    toggleIcon.addEventListener('click', () =>
    //    {
    //        const isCollapsed = diffElement.style.display === 'none';
    //        diffElement.style.display = isCollapsed ? 'block' : 'none';
    //        toggleIcon.textContent = isCollapsed ? '▼' : '▶';
    //    });
    //
    //    collapsibleFileElement.appendChild(toggleIcon);
    //    collapsibleFileElement.appendChild(fileNameElement);
    //    messageElement.appendChild(collapsibleFileElement);
    //    messageElement.appendChild(diffElement);
    //
    //    // Highlight the code in the diffElement
    //    hljs.highlightElement(diffElement); // Updated to use highlightElement instead of highlightBlock

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addPromptToChat(message)
{
    addLogEntry('Prompting user for response');
    updateMessageBlock('assistant');

    sendButton.disabled = true;

    const messageElement = document.createElement('div');
    const textArea = document.createElement('div');
    const text = document.createElement('p');
    const promptButtons = document.createElement('div');
    const yesButton = document.createElement('button');
    const noButton = document.createElement('button');

    messageElement.className = 'aider-prompt';
    textArea.className = 'prompt-text-area';
    text.className = 'prompt-text';
    text.textContent = message;
    promptButtons.className = 'prompt-buttons';
    yesButton.id = 'yes-button';
    yesButton.className = 'vscode-button';
    yesButton.innerHTML = '<span class="codicon codicon-check">Yes</span>';
    noButton.id = 'no-button';
    noButton.className = 'vscode-button';
    noButton.innerHTML = '<span class="codicon codicon-close">No</span>';

    textArea.appendChild(text);
    textArea.appendChild(promptButtons);
    promptButtons.appendChild(yesButton);
    promptButtons.appendChild(noButton);
    messageElement.appendChild(textArea);

    currentMessageDiv.appendChild(messageElement); // Append to the current message div

    lastMessageType = 'assistant';

    yesButton.addEventListener('click', () =>
    {
        vscode.postMessage({
            command: 'promptUserResponse',
            response: 'yes'
        });
        parentElement=messageElement.parentElement;
        parentElement.removeChild(messageElement);
        sendButton.disabled = false;
    });

    noButton.addEventListener('click', () =>
    {
        vscode.postMessage({
            command: 'promptUserResponse',
            response: 'no'
        });
        parentElement=messageElement.parentElement;
        parentElement.removeChild(messageElement);
        sendButton.disabled = false;
    });
}

function updateStreamMessage(message, final, html=false) 
{
    if(!streamMessage)
    {
        updateMessageBlock('assistant');

        streamMessage = document.createElement('div');
        streamMessage.className = 'assistant-message-container';
        currentMessageDiv.appendChild(streamMessage);
    }

    if(html)
    {   streamMessage.innerHTML = message;}
    else
    {    streamMessage.textContent = message;}

    if(final)
    {
        streamMessage = null;
    }
}

function updateVersion(version) {
    const versionText = document.getElementById('version-text');

    if (versionText) {
        versionText.textContent = version;
    }
}

function addLogEntry(entry)
{
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toISOString()}] ${entry}`;
    debugLog.appendChild(logEntry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

sendButton.addEventListener('click', () =>
{
    const message = userInput.value.trim();
    if(message)
    {
//        addMessageToChat('user', message);
        vscode.postMessage({
            command: 'sendCommand',
            type: 'user',
            text: message
        });
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) =>
{
    if(e.key === 'Enter' && !e.shiftKey)
    {
        e.preventDefault();
        sendButton.click();
    }
});

debugToggle.addEventListener('click', () =>
{
    debugView.classList.toggle('hidden');
});

window.addEventListener('message', event =>
{
    const message = event.data;
    switch(message.command)
    {
        case 'updateChatHistory':
            addMessageToChat('user', message.text);
            break;
        case 'addUserMessage':
            addMessageToChat('user', message.text);
            break;
        case 'addResponse':
            addMessageToChat('assistant', message.text);
            break;
        case 'log':
            addLogEntry(message.text);
            break;
        case 'promptUser':
            addPromptToChat(message.text);
            break;
        case 'addAssistantMessage':
            //            addAssistantMessageToChat(message.text, message.fileName, message.diff, message.changeCount);
            addAssistantMessageToChat(message.html);
            break;
        case 'updateStreamMessage':
            if (message.text)
            {   updateStreamMessage(message.text, message.final);}
            else
            {   updateStreamMessage(message.html, message.final, true);}
            break;
        case 'version':
            updateVersion(message.version);
            break;
    }
});

// Set the highlight.js theme based on the current VSCode theme
setHighlightJsTheme();


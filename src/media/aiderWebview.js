const vscode = acquireVsCodeApi();

const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const debugToggle = document.getElementById('debug-toggle');
const debugView = document.getElementById('debug-view');
const debugLog = document.getElementById('debug-log');

let lastMessageType = ''; // Track the last message type
let currentMessageDiv; // Track the current message div

function setHighlightJsTheme() {
    const theme = vscode.getState().theme || 'default'; // Get the current theme from VSCode state
    const highlightJsTheme = theme === 'dark' ? 'dark' : 'default'; // Set highlight.js theme based on VSCode theme
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `./media/highlight/styles/${highlightJsTheme}.min.css`; // Load from local styles directory
}

function addMessageToChat(message, isUser = false) {
    if (lastMessageType !== (isUser ? 'user' : 'assistant')) {
        currentMessageDiv = document.createElement('div');
        currentMessageDiv.className = isUser ? 'user-message-container' : 'assistant-message-container';
        chatHistory.appendChild(currentMessageDiv);
    }

    const messageElement = document.createElement('div');
    messageElement.className = isUser ? 'user-message' : 'aider-response';
    messageElement.textContent = message;
    currentMessageDiv.appendChild(messageElement);

    lastMessageType = isUser ? 'user' : 'assistant'; // Update last message type

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addAssistantMessageToChat(message, fileName, diff, changeCount) {
    addMessageToChat(message, false); // Use the same function to add assistant messages
    const messageElement = currentMessageDiv.lastChild; // Get the last message element added

    const collapsibleFileElement = document.createElement('div');
    collapsibleFileElement.className = 'collapsible-file';

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'collapsible-icon';
    toggleIcon.textContent = '▼';
    toggleIcon.style.cursor = 'pointer';

    const fileNameElement = document.createElement('p');
    
    // Parse the diff to count additions and subtractions
    const additions = (diff.match(/\+/g) || []).length;
    const subtractions = (diff.match(/-/g) || []).length;
    fileNameElement.textContent = `File: ${fileName} (${changeCount} changes, +${additions}, -${subtractions})`;

    const diffElement = document.createElement('pre');
    diffElement.className = 'code-diff';
    diffElement.innerHTML = `<code>diff\n${diff}\n</code>`; // Updated to wrap in <pre><code>
    diffElement.style.display = 'none'; // Start in a collapsed state

    toggleIcon.addEventListener('click', () => {
        const isCollapsed = diffElement.style.display === 'none';
        diffElement.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.textContent = isCollapsed ? '▼' : '▶';
    });

    collapsibleFileElement.appendChild(toggleIcon);
    collapsibleFileElement.appendChild(fileNameElement);
    messageElement.appendChild(collapsibleFileElement);
    messageElement.appendChild(diffElement);

    // Highlight the code in the diffElement
    hljs.highlightElement(diffElement); // Updated to use highlightElement instead of highlightBlock

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addPromptToChat(message) {
    if (lastMessageType !== 'assistant' && lastMessageType !== '') {
        currentMessageDiv = document.createElement('div');
        currentMessageDiv.className = 'assistant-message-container';
        chatHistory.appendChild(currentMessageDiv);
    }

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
    yesButton.innerHTML = '<span class="codicon codicon-check"></span>';
    noButton.id = 'no-button';
    noButton.className = 'vscode-button';
    noButton.innerHTML = '<span class="codicon codicon-close"></span>';

    textArea.appendChild(text);
    textArea.appendChild(promptButtons);
    promptButtons.appendChild(yesButton);
    promptButtons.appendChild(noButton);
    messageElement.appendChild(textArea);
    currentMessageDiv.appendChild(messageElement); // Append to the current message div

    lastMessageType = 'assistant';

    yesButton.addEventListener('click', () => {
        vscode.postMessage({
            command: 'promptUserResponse',
            response: 'yes'
        });
        chatHistory.removeChild(messageElement);
        sendButton.disabled = false;
    });

    noButton.addEventListener('click', () => {
        vscode.postMessage({
            command: 'promptUserResponse',
            response: 'no'
        });
        chatHistory.removeChild(messageElement);
        sendButton.disabled = false;
    });
}

function addLogEntry(entry) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toISOString()}] ${entry}`;
    debugLog.appendChild(logEntry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        addMessageToChat(message, true);
        vscode.postMessage({
            command: 'sendCommand',
            type: 'user',
            text: message
        });
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

debugToggle.addEventListener('click', () => {
    debugView.classList.toggle('hidden');
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateChatHistory':
            addMessageToChat(message.text);
            break;
        case 'addUserMessage':
            addMessageToChat(message.text, true);
            break;
        case 'addResponse':
            addMessageToChat(message.text);
            break;
        case 'log':
            addLogEntry(message.text);
            break;
        case 'promptUser':
            addPromptToChat(message.text);
            break;
        case 'updateChatHistoryAssistant':
            addAssistantMessageToChat(message.text, message.fileName, message.diff, message.changeCount);
            break;
    }
});

// Set the highlight.js theme based on the current VSCode theme
setHighlightJsTheme();

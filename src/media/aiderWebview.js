const vscode = acquireVsCodeApi();

const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const debugToggle = document.getElementById('debug-toggle');
const debugView = document.getElementById('debug-view');
const debugLog = document.getElementById('debug-log');

function setHighlightJsTheme() {
    const theme = vscode.getState().theme || 'default'; // Get the current theme from VSCode state
    const highlightJsTheme = theme === 'dark' ? 'dark' : 'default'; // Set highlight.js theme based on VSCode theme
    document.querySelector('link[href*="highlight.js"]').setAttribute('href', `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/${highlightJsTheme}.min.css`);
}

function addMessageToChat(message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.className = isUser ? 'user-message' : 'aider-response';
    messageElement.textContent = message;
    chatHistory.appendChild(messageElement);

    const divider = document.createElement('hr');
    chatHistory.appendChild(divider);

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addAssistantMessageToChat(message, fileName, diff, changeCount) {
    const messageElement = document.createElement('div');
    messageElement.className = 'aider-response';

    const messageContent = document.createElement('p');
    messageContent.textContent = message;

    const fileNameElement = document.createElement('p');
    fileNameElement.textContent = `File: ${fileName} (${changeCount} changes)`;

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'collapsible-icon';
    toggleIcon.textContent = '▼';
    toggleIcon.style.cursor = 'pointer';

    const diffElement = document.createElement('pre');
    diffElement.className = 'code-diff';
    diffElement.innerHTML = `<code>diff\n${diff}\n</code>`; // Updated to wrap in <pre><code>
    diffElement.style.display = 'block';

    toggleIcon.addEventListener('click', () => {
        const isCollapsed = diffElement.style.display === 'none';
        diffElement.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.textContent = isCollapsed ? '▼' : '▶';
    });

    messageElement.appendChild(messageContent);
    messageElement.appendChild(fileNameElement);
    messageElement.appendChild(toggleIcon);
    messageElement.appendChild(diffElement);
    chatHistory.appendChild(messageElement);

    // Highlight the code in the diffElement
    hljs.highlightElement(diffElement); // Updated to use highlightElement instead of highlightBlock

    const divider = document.createElement('hr');
    chatHistory.appendChild(divider);

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addPromptToChat(message) {
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
    chatHistory.appendChild(messageElement);

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

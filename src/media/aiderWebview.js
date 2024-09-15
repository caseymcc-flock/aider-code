// Get the VS Code API
const vscode = acquireVsCodeApi();

// DOM elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const debugToggle = document.getElementById('debug-toggle');
const debugView = document.getElementById('debug-view');
const debugLog = document.getElementById('debug-log');

// Function to add a message to the chat history
function addMessageToChat(message, isUser = false) {
    const messageElement = document.createElement('div');
    messageElement.className = isUser ? 'user-message' : 'aider-response';
    messageElement.textContent = message;
    chatHistory.appendChild(messageElement);

    // Create a divider
    const divider = document.createElement('hr');
    chatHistory.appendChild(divider);

    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addAssistantMessageToChat( message, fileName, diff ) {
    const messageElement = document.createElement('div');
    messageElement.className = 'aider-response';
    
    const messageContent = document.createElement('p');
    messageContent.textContent = message;

    const fileNameElement = document.createElement('p');
    fileNameElement.textContent = `File: ${fileName}`;

    const diffElement = document.createElement('pre');
    diffElement.className = 'code-diff';
    diffElement.textContent = diff;

    messageElement.appendChild(messageContent);
    messageElement.appendChild(fileNameElement);
    messageElement.appendChild(diffElement);
    chatHistory.appendChild(messageElement);

    // Create a divider
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
    yesButton.id = 'yes-button'; // Set ID for yes button
    yesButton.className = 'vscode-button';
    yesButton.innerHTML = '<span class="codicon codicon-check"></span>'; // Codicon for check
    noButton.id = 'no-button'; // Set ID for no button
    noButton.className = 'vscode-button';
    noButton.innerHTML = '<span class="codicon codicon-close"></span>'; // Codicon for close

    // Append text and buttons to the same container
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

// Function to add a log entry to the debug view
function addLogEntry(entry) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toISOString()}] ${entry}`;
    debugLog.appendChild(logEntry);
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Event listener for the send button
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

// Event listener for the Enter key in the textarea
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

// Event listener for the debug toggle button
debugToggle.addEventListener('click', () => {
    debugView.classList.toggle('hidden');
});

// Handle messages from the extension
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
            addAssistantMessageToChat(message.text, message.fileName, message.diff);
            break;
    }
});

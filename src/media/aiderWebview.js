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
    chatHistory.scrollTop = chatHistory.scrollHeight;
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
    }
});

// Show the source of the webview in the debug log
const webviewSource = `
    <h3>Webview Source</h3>
    <pre>${document.documentElement.outerHTML}</pre>
`;
addLogEntry(webviewSource);

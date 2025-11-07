/**
 * Quiz Solver Settings Page
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settingsForm');
    const apiKeyInput = document.getElementById('apiKey');
    const togglePassword = document.getElementById('togglePassword');
    const statusDiv = document.getElementById('status');

    let isPasswordVisible = false;

    // Load saved settings
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
        if (result.openaiApiKey) {
            apiKeyInput.value = result.openaiApiKey;
        }
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        isPasswordVisible = !isPasswordVisible;
        apiKeyInput.type = isPasswordVisible ? 'text' : 'password';
        togglePassword.textContent = isPasswordVisible ? 'Hide API Key' : 'Show API Key';
    });

    // Save settings
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            showStatus('API key should start with "sk-"', 'error');
            return;
        }

        chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Settings saved successfully!', 'success');
            }
        });
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }
});


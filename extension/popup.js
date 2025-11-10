/**
 * Quiz Solver Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
    const detectBtn = document.getElementById('detectBtn');
    const statusDiv = document.getElementById('status');
    const questionsList = document.getElementById('questionsList');
    const settingsLink = document.getElementById('settingsLink');
    const settingsPanel = document.getElementById('settingsPanel');
    const mainView = document.getElementById('mainView');
    const closeSettings = document.getElementById('closeSettings');
    const cancelSettings = document.getElementById('cancelSettings');
    const settingsForm = document.getElementById('settingsForm');
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const toggleOpenAIPassword = document.getElementById('toggleOpenAIPassword');
    const toggleGeminiPassword = document.getElementById('toggleGeminiPassword');
    const providerOpenAI = document.getElementById('providerOpenAI');
    const providerGemini = document.getElementById('providerGemini');
    const providerOpenAILabel = document.getElementById('providerOpenAILabel');
    const providerGeminiLabel = document.getElementById('providerGeminiLabel');
    const openaiKeyGroup = document.getElementById('openaiKeyGroup');
    const geminiKeyGroup = document.getElementById('geminiKeyGroup');
    const settingsStatus = document.getElementById('settingsStatus');
    const enableToggle = document.getElementById('enableToggle');
    const toggleStatus = document.getElementById('toggleStatus');
    const debugLoggingToggle = document.getElementById('debugLoggingToggle');
    
    let isOpenAIPasswordVisible = false;
    let isGeminiPasswordVisible = false;
    let isSettingsOpen = false;
    
    function setStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }
    
    function showSettings() {
        isSettingsOpen = true;
        mainView.style.display = 'none';
        settingsPanel.classList.add('active');
        
        // Load current settings
        chrome.storage.sync.get(['aiProvider', 'openaiApiKey', 'geminiApiKey', 'debugLogging'], (result) => {
            const provider = result.aiProvider || 'openai';
            updateProviderUI(provider);
            
            if (result.openaiApiKey) {
                openaiApiKeyInput.value = result.openaiApiKey;
            }
            if (result.geminiApiKey) {
                geminiApiKeyInput.value = result.geminiApiKey;
            }
            debugLoggingToggle.checked = result.debugLogging === true;
        });
    }
    
    function updateProviderUI(provider) {
        // Update radio button states
        providerOpenAI.checked = provider === 'openai';
        providerGemini.checked = provider === 'gemini';
        
        // Update visual active states
        if (provider === 'openai') {
            providerOpenAILabel.classList.add('active');
            providerGeminiLabel.classList.remove('active');
            openaiKeyGroup.style.display = 'block';
            geminiKeyGroup.style.display = 'none';
        } else {
            providerOpenAILabel.classList.remove('active');
            providerGeminiLabel.classList.add('active');
            openaiKeyGroup.style.display = 'none';
            geminiKeyGroup.style.display = 'block';
        }
    }
    
    // Handle provider selection change
    providerOpenAI.addEventListener('change', () => {
        if (providerOpenAI.checked) {
            updateProviderUI('openai');
        }
    });
    
    providerGemini.addEventListener('change', () => {
        if (providerGemini.checked) {
            updateProviderUI('gemini');
        }
    });
    
    // Also handle clicks on labels for better UX
    providerOpenAILabel.addEventListener('click', (e) => {
        if (e.target !== providerOpenAI) {
            providerOpenAI.checked = true;
            providerOpenAI.dispatchEvent(new Event('change'));
        }
    });
    
    providerGeminiLabel.addEventListener('click', (e) => {
        if (e.target !== providerGemini) {
            providerGemini.checked = true;
            providerGemini.dispatchEvent(new Event('change'));
        }
    });
    
    function hideSettings() {
        isSettingsOpen = false;
        settingsPanel.classList.remove('active');
        mainView.style.display = 'block';
        settingsStatus.style.display = 'none';
    }
    
    function showSettingsStatus(message, type) {
        settingsStatus.textContent = message;
        settingsStatus.className = `status ${type}`;
        settingsStatus.style.display = 'block';
        setTimeout(() => {
            settingsStatus.style.display = 'none';
        }, 3000);
    }
    
    function saveSettings() {
        const selectedProvider = providerOpenAI.checked ? 'openai' : 'gemini';
        const openaiKey = openaiApiKeyInput.value.trim();
        const geminiKey = geminiApiKeyInput.value.trim();
        
        // Validate the selected provider's API key
        if (selectedProvider === 'openai') {
            if (!openaiKey) {
                showSettingsStatus('Please enter an OpenAI API key', 'error');
                return;
            }
            if (!openaiKey.startsWith('sk-')) {
                showSettingsStatus('OpenAI API key should start with "sk-"', 'error');
                return;
            }
        } else {
            if (!geminiKey) {
                showSettingsStatus('Please enter a Gemini API key', 'error');
                return;
            }
            if (!geminiKey.startsWith('AIza')) {
                showSettingsStatus('Gemini API key should start with "AIza"', 'error');
                return;
            }
        }

        const debugLogging = debugLoggingToggle.checked;

        chrome.storage.sync.set({ 
            aiProvider: selectedProvider,
            openaiApiKey: openaiKey,
            geminiApiKey: geminiKey,
            debugLogging: debugLogging
        }, () => {
            if (chrome.runtime.lastError) {
                showSettingsStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showSettingsStatus('Settings saved successfully!', 'success');
                // Notify content scripts of debug logging change
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { 
                            action: 'debugLoggingChanged', 
                            enabled: debugLogging 
                        }).catch(() => {
                            // Content script might not be loaded yet, that's okay
                        });
                    }
                });
                setTimeout(() => {
                    hideSettings();
                    checkApiKey();
                }, 1500);
            }
        });
    }
    
    function checkApiKey() {
        chrome.storage.sync.get(['aiProvider', 'openaiApiKey', 'geminiApiKey'], (result) => {
            const provider = result.aiProvider || 'openai';
            const hasKey = provider === 'openai' 
                ? !!result.openaiApiKey 
                : !!result.geminiApiKey;
            
            if (!hasKey) {
                // No API key - show settings automatically
                showSettings();
                const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
                setStatus(`⚠️ ${providerName} API key required to reveal answers`, 'warning');
            }
        });
    }
    
    // Load and update extension enabled state
    function loadExtensionState() {
        chrome.storage.sync.get(['extensionEnabled'], (result) => {
            // Default to disabled if not set
            const isEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : false;
            enableToggle.checked = isEnabled;
            updateToggleUI(isEnabled);
        });
    }
    
    function updateToggleUI(isEnabled) {
        if (isEnabled) {
            toggleStatus.textContent = 'Extension is enabled';
            toggleStatus.className = 'toggle-status enabled';
            detectBtn.disabled = false;
            if (!isSettingsOpen) {
                setStatus('Click "Detect Questions" to scan the current page', 'info');
            }
        } else {
            toggleStatus.textContent = 'Extension is disabled';
            toggleStatus.className = 'toggle-status disabled';
            detectBtn.disabled = true;
            if (!isSettingsOpen) {
                setStatus('Extension is disabled. Enable it to detect questions.', 'info');
            }
        }
    }
    
    function saveExtensionState(isEnabled) {
        chrome.storage.sync.set({ extensionEnabled: isEnabled }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving extension state:', chrome.runtime.lastError);
            } else {
                updateToggleUI(isEnabled);
                // Notify content scripts of state change
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, { 
                            action: 'extensionStateChanged', 
                            enabled: isEnabled 
                        }).catch(() => {
                            // Content script might not be loaded yet, that's okay
                        });
                    }
                });
            }
        });
    }
    
    // Toggle extension enabled/disabled
    enableToggle.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        saveExtensionState(isEnabled);
    });
    
    // Check for API key on load
    checkApiKey();
    
    // Load extension state on popup open
    loadExtensionState();
    
    // Toggle settings panel
    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSettings();
    });
    
    closeSettings.addEventListener('click', () => {
        hideSettings();
    });
    
    cancelSettings.addEventListener('click', () => {
        hideSettings();
    });
    
    // Toggle password visibility
    toggleOpenAIPassword.addEventListener('click', () => {
        isOpenAIPasswordVisible = !isOpenAIPasswordVisible;
        openaiApiKeyInput.type = isOpenAIPasswordVisible ? 'text' : 'password';
        toggleOpenAIPassword.textContent = isOpenAIPasswordVisible ? 'Hide API Key' : 'Show API Key';
    });
    
    toggleGeminiPassword.addEventListener('click', () => {
        isGeminiPasswordVisible = !isGeminiPasswordVisible;
        geminiApiKeyInput.type = isGeminiPasswordVisible ? 'text' : 'password';
        toggleGeminiPassword.textContent = isGeminiPasswordVisible ? 'Hide API Key' : 'Show API Key';
    });
    
    // Save settings
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });

    function displayQuestions(questions) {
        if (questions.length === 0) {
            questionsList.innerHTML = '<p style="color: #666; font-size: 12px;">No questions detected on this page.</p>';
            return;
        }

        questionsList.innerHTML = questions.map((q, index) => {
            const questionNum = q.questionNumber 
                ? `Question ${q.questionNumber}${q.totalQuestions ? ` of ${q.totalQuestions}` : ''}`
                : `Question ${index + 1}`;
            
            const answersHtml = q.answers.map((a, i) => {
                const letter = String.fromCharCode(65 + i);
                return `<div>${letter}. ${a.text}</div>`;
            }).join('');

            return `
                <div class="question-item">
                    <strong>${questionNum}</strong>
                    <div style="margin-bottom: 8px;">${q.questionText}</div>
                    <div class="answers">${answersHtml}</div>
                </div>
            `;
        }).join('');
    }

    detectBtn.addEventListener('click', async () => {
        // Check if extension is enabled
        const isEnabled = enableToggle.checked;
        if (!isEnabled) {
            setStatus('Extension is disabled. Enable it using the toggle above.', 'warning');
            return;
        }

        detectBtn.disabled = true;
        setStatus('Detecting questions...', 'info');

        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Execute script to detect questions
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    if (typeof window.quizSolverDetectQuestions === 'function') {
                        return window.quizSolverDetectQuestions();
                    }
                    // Fallback: try to access already detected questions
                    if (window.quizSolverQuestions) {
                        return window.quizSolverQuestions;
                    }
                    return [];
                }
            });

            const questions = results[0]?.result || [];
            
            if (questions.length > 0) {
                setStatus(`Found ${questions.length} question(s)`, 'success');
                displayQuestions(questions);
            } else {
                setStatus('No questions detected. Make sure you are on a quiz page.', 'error');
                questionsList.innerHTML = '';
            }
        } catch (error) {
            console.error('Error detecting questions:', error);
            setStatus('Error detecting questions. Check console for details.', 'error');
        } finally {
            detectBtn.disabled = false;
        }
    });

    // Try to get questions on popup open if they're already detected
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
            try {
                // Check if extension is enabled first
                chrome.storage.sync.get(['extensionEnabled'], async (result) => {
                    const isEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : false;
                    if (!isEnabled) {
                        return; // Don't try to get questions if extension is disabled
                    }
                    
                    try {
                        const results = await chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            function: () => {
                                return window.quizSolverQuestions || [];
                            }
                        });
                        
                        const questions = results[0]?.result || [];
                        if (questions.length > 0) {
                            setStatus(`Found ${questions.length} question(s)`, 'success');
                            displayQuestions(questions);
                        }
                    } catch (error) {
                        // Content script might not be loaded yet, that's okay
                    }
                });
            } catch (error) {
                // Error querying tabs, that's okay
            }
        }
    });
});


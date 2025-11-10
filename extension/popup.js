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
    const apiKeyInput = document.getElementById('apiKey');
    const togglePassword = document.getElementById('togglePassword');
    const settingsStatus = document.getElementById('settingsStatus');
    
    let isPasswordVisible = false;
    let isSettingsOpen = false;
    
    function setStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }
    
    function showSettings() {
        isSettingsOpen = true;
        mainView.style.display = 'none';
        settingsPanel.classList.add('active');
        
        // Load current API key
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
            if (result.openaiApiKey) {
                apiKeyInput.value = result.openaiApiKey;
            }
        });
    }
    
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
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showSettingsStatus('Please enter an API key', 'error');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            showSettingsStatus('API key should start with "sk-"', 'error');
            return;
        }

        chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
            if (chrome.runtime.lastError) {
                showSettingsStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showSettingsStatus('Settings saved successfully!', 'success');
                setTimeout(() => {
                    hideSettings();
                    checkApiKey();
                }, 1500);
            }
        });
    }
    
    function checkApiKey() {
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
            if (!result.openaiApiKey) {
                // No API key - show settings automatically
                showSettings();
                setStatus('⚠️ OpenAI API key required to reveal answers', 'warning');
            }
        });
    }
    
    // Check for API key on load
    checkApiKey();
    
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
    togglePassword.addEventListener('click', () => {
        isPasswordVisible = !isPasswordVisible;
        apiKeyInput.type = isPasswordVisible ? 'text' : 'password';
        togglePassword.textContent = isPasswordVisible ? 'Hide API Key' : 'Show API Key';
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
        }
    });
});


/**
 * Quiz Solver Content Script
 * 
 * This script runs on quiz pages and detects questions/answers,
 * logging them to the console for now.
 */

(function() {
    'use strict';


    let isExtensionEnabled = false;
    let mutationObserver = null;
    let debugLoggingEnabled = false;

    // Get the appropriate AI service based on user's provider selection
    function getAIService() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['aiProvider'], (result) => {
                const provider = result.aiProvider || 'openai';
                
                if (provider === 'gemini') {
                    if (typeof GeminiService === 'undefined') {
                        resolve(null);
                        return;
                    }
                    const service = new GeminiService();
                    service.initialize().then(() => resolve(service));
                } else {
                    if (typeof OpenAIService === 'undefined') {
                        resolve(null);
                        return;
                    }
                    const service = new OpenAIService();
                    service.initialize().then(() => resolve(service));
                }
            });
        });
    }

    // Debug logging utility
    function debugLog(...args) {
        if (debugLoggingEnabled) {
            console.log('[Quiz Solver]', ...args);
        }
    }

    function debugLogGroup(label, color = '#2196F3') {
        if (debugLoggingEnabled) {
            console.group(`%c[Quiz Solver] ${label}`, `color: ${color}; font-weight: bold;`);
        }
    }

    function debugLogGroupEnd() {
        if (debugLoggingEnabled) {
            console.groupEnd();
        }
    }

    // Check debug logging setting
    function checkDebugLogging(callback) {
        chrome.storage.sync.get(['debugLogging'], (result) => {
            debugLoggingEnabled = result.debugLogging === true;
            if (callback) callback(debugLoggingEnabled);
        });
    }

    // Check if extension is enabled
    function checkExtensionEnabled(callback) {
        chrome.storage.sync.get(['extensionEnabled'], (result) => {
            // Default to disabled if not set
            isExtensionEnabled = result.extensionEnabled !== undefined ? result.extensionEnabled : false;
            if (callback) callback(isExtensionEnabled);
        });
    }

    // Clean up extension UI elements
    function cleanupExtensionUI() {
        // Remove all reveal buttons
        document.querySelectorAll('.quiz-solver-reveal-btn, .quiz-solver-reveal-all-btn').forEach(btn => btn.remove());
        // Remove all checkmarks
        document.querySelectorAll('.quiz-solver-checkmark').forEach(checkmark => checkmark.remove());
        // Remove all explanations
        document.querySelectorAll('.quiz-solver-explanation').forEach(explanation => explanation.remove());
        // Clear questions
        window.quizSolverQuestions = [];
    }

    // Stop extension functionality
    function stopExtension() {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
        cleanupExtensionUI();
    }

    // Start extension functionality
    function startExtension() {
        if (mutationObserver) {
            // Already running
            return;
        }
        waitForContent(() => {
            initQuestionDetector();
            observeForQuestions();
        });
    }

    // Wait for page to be fully loaded (including dynamic content)
    function waitForContent(callback, maxAttempts = 50) {
        let attempts = 0;
        
        debugLog('Starting content detection wait loop...');
        
        const checkContent = () => {
            attempts++;
            
            // Check if there are any quiz-related elements
            const inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
            const hasInputs = inputs.length > 0;
            const hasQuestionText = document.body.textContent.match(/Question\s+\d+/i);
            // Check for Docebo-specific elements
            const doceboElements = document.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content, [id^="dcb-sh-question-"]');
            const hasDoceboQuestions = doceboElements.length > 0;
            
            if (attempts % 5 === 0 || hasInputs || hasQuestionText || hasDoceboQuestions) {
                debugLog(`Check attempt ${attempts}:`, {
                    inputs: inputs.length,
                    hasQuestionText: !!hasQuestionText,
                    doceboElements: doceboElements.length,
                    bodyTextLength: document.body.textContent.length
                });
            }
            
            if (hasInputs || hasQuestionText || hasDoceboQuestions || attempts >= maxAttempts) {
                debugLog(`Content check complete after ${attempts} attempts`);
                callback();
            } else {
                setTimeout(checkContent, 200);
            }
        };
        
        // Start checking after a short delay
        setTimeout(checkContent, 500);
    }

    // Initialize question detector and log results
    function initQuestionDetector() {
        debugLog('Initializing question detector...');
        
        if (typeof QuestionDetector === 'undefined') {
            console.error('[Quiz Solver] ERROR: QuestionDetector class not found!');
            debugLog('Available globals:', Object.keys(window).filter(k => k.includes('Question') || k.includes('quiz')));
            return;
        }

        debugLog('QuestionDetector class found, creating instance...');

        // Debug: Check for Docebo elements
        const doceboElements = document.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content, [id^="dcb-sh-question-"]');
        debugLog(`Docebo elements found: ${doceboElements.length}`);
        if (doceboElements.length > 0 && debugLoggingEnabled) {
            console.log(`%c[Quiz Solver] Found ${doceboElements.length} Docebo question element(s)`, 'color: #FF9800; font-weight: bold;');
            doceboElements.forEach((el, i) => {
                debugLog(`Docebo element ${i + 1}:`, {
                    id: el.id,
                    classes: Array.from(el.classList),
                    hasAttr: el.hasAttribute('dcbshquestioncontent'),
                    textPreview: el.textContent.substring(0, 100)
                });
            });
        }

        const detector = new QuestionDetector();
        debugLog('Detector created, running detection strategies...');
        const questions = detector.detectQuestions();
        debugLog(`Detection complete, found ${questions.length} question(s)`);
        
        if (questions.length === 0) {
            console.log('%c[Quiz Solver] No questions detected on this page', 'color: #f44336;');
            debugLog('Debug info:', {
                doceboElements: doceboElements.length,
                inputs: document.querySelectorAll('input[type="checkbox"], input[type="radio"]').length,
                questionText: document.body.textContent.match(/Question\s+\d+/i) ? 'Found' : 'Not found'
            });
            return;
        }

        // Log summary
        console.log(`%c[Quiz Solver] Found ${questions.length} question(s)`, 
            'color: #4CAF50; font-weight: bold; font-size: 14px;');
        
        // Log each question with formatted output if debug logging is enabled
        if (debugLoggingEnabled) {
            questions.forEach((question, index) => {
                const questionNum = question.questionNumber 
                    ? `Question ${question.questionNumber}${question.totalQuestions ? ` of ${question.totalQuestions}` : ''}`
                    : `Question ${index + 1}`;
                
                console.group(`%c${questionNum}`, 'color: #2196F3; font-weight: bold;');
                console.log('%cQuestion:', 'color: #666; font-weight: bold;', question.questionText);
                console.log('%cAnswers:', 'color: #666; font-weight: bold;');
                
                question.answers.forEach((answer, ansIndex) => {
                    const letter = String.fromCharCode(65 + ansIndex); // A, B, C, D...
                    const selected = answer.isSelected ? ' ✓' : '';
                    console.log(`  ${letter}. ${answer.text}${selected}`);
                });
                
                console.log('%cElement:', 'color: #999; font-size: 11px;', question.element);
                console.groupEnd();
            });
        }

        // Store questions globally for potential future use
        window.quizSolverQuestions = questions;
        
        // Add Reveal All button at the top
        addRevealAllButton(questions);
        
        // Add Reveal buttons to questions
        addRevealButtons(questions);
        
        // Dispatch custom event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('quizSolver:questionsDetected', {
            detail: { questions }
        }));
        
        return questions;
    }

    // Add "Reveal All" button at the top of the quiz
    function addRevealAllButton(questions) {
        if (questions.length === 0) return;
        // Check if either service is available
        if (typeof OpenAIService === 'undefined' && typeof GeminiService === 'undefined') {
            console.warn('[Quiz Solver] AI service not available, skipping Reveal All button');
            return;
        }

        // Check if button already exists
        if (document.querySelector('.quiz-solver-reveal-all-btn')) return;

        // Find a good location to insert the button - try to find the first question container
        const firstQuestion = questions[0];
        const firstQuestionElement = firstQuestion.element;
        
        // Try to find a parent container that contains all questions (quiz container)
        let quizContainer = firstQuestionElement;
        let depth = 0;
        while (quizContainer && depth < 5) {
            const allQuestionsInContainer = Array.from(quizContainer.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content'));
            if (allQuestionsInContainer.length >= questions.length) {
                break;
            }
            quizContainer = quizContainer.parentElement;
            depth++;
        }

        // If we found a good container, insert at the top, otherwise insert before first question
        const insertLocation = quizContainer || firstQuestionElement;
        
        // Create Reveal All button
        const revealAllBtn = document.createElement('button');
        revealAllBtn.className = 'quiz-solver-reveal-all-btn';
        revealAllBtn.textContent = 'Reveal All Answers';
        revealAllBtn.style.cssText = `
            margin: 20px auto;
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            font-family: inherit;
            display: block;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // Add hover effect
        revealAllBtn.addEventListener('mouseenter', () => {
            if (!revealAllBtn.disabled) {
                revealAllBtn.style.backgroundColor = '#45a049';
                revealAllBtn.style.transform = 'translateY(-1px)';
                revealAllBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            }
        });
        revealAllBtn.addEventListener('mouseleave', () => {
            if (!revealAllBtn.disabled) {
                revealAllBtn.style.backgroundColor = '#4CAF50';
                revealAllBtn.style.transform = 'translateY(0)';
                revealAllBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            }
        });
        
        // Add click handler
        revealAllBtn.addEventListener('click', async () => {
            await handleRevealAllClick(revealAllBtn, questions);
        });
        
        // Insert at the beginning of the container
        if (insertLocation.firstChild) {
            insertLocation.insertBefore(revealAllBtn, insertLocation.firstChild);
        } else {
            insertLocation.appendChild(revealAllBtn);
        }
    }

    // Handle Reveal All button click
    async function handleRevealAllClick(button, questions) {
        const aiService = await getAIService();
        if (!aiService) {
            alert('AI service not available. Please check your settings.');
            return;
        }
        
        if (!aiService.hasApiKey()) {
            chrome.storage.sync.get(['aiProvider'], (result) => {
                const provider = result.aiProvider || 'openai';
                const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
                alert(`${providerName} API key not configured. Please set it in extension settings.\n\nClick the extension icon and go to Settings.`);
            });
            return;
        }
        
        // Disable button and show loading
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = `Revealing ${questions.length} questions...`;
        button.style.opacity = '0.7';
        button.style.cursor = 'not-allowed';
        
        let successCount = 0;
        let errorCount = 0;
        
        try {
            // Process questions sequentially to avoid rate limits
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                button.textContent = `Revealing ${i + 1}/${questions.length}...`;
                
                try {
                    const result = await aiService.getAnswer(question);
                    highlightCorrectAnswers(question, result.correctAnswers, result.explanation);
                    successCount++;
                    
                    // Small delay between requests to avoid rate limiting
                    if (i < questions.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`[Quiz Solver] Error revealing question ${i + 1}:`, error);
                    errorCount++;
                    // Continue with next question even if one fails
                }
            }
            
            // Update button state
            if (errorCount === 0) {
                button.textContent = '✓ All Answers Revealed';
                button.style.backgroundColor = '#28a745';
            } else {
                button.textContent = `Revealed ${successCount}/${questions.length} (${errorCount} errors)`;
                button.style.backgroundColor = '#ff9800';
            }
            
            // Show summary
            if (errorCount > 0) {
                console.warn(`[Quiz Solver] Revealed ${successCount} questions successfully, ${errorCount} failed`);
            }
            
        } catch (error) {
            console.error('[Quiz Solver] Error in Reveal All:', error);
            button.textContent = 'Error - Click to Retry';
            button.style.backgroundColor = '#f44336';
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            alert(`Error: ${error.message}`);
        }
    }

    // Add Reveal buttons to detected questions
    async function addRevealButtons(questions) {
        // Check if either service is available
        if (typeof OpenAIService === 'undefined' && typeof GeminiService === 'undefined') {
            console.warn('[Quiz Solver] AI service not available, skipping Reveal buttons');
            return;
        }
        
        questions.forEach((question, index) => {
            // Check if button already exists for this question
            if (question.element.querySelector('.quiz-solver-reveal-btn')) return;
            
            // Find where to insert the button - look for the question text element
            const questionTextElement = question.element.querySelector('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
            
            if (!questionTextElement) {
                // Fallback: try to find any text element or use the container
                const fallbackElement = question.element.querySelector('h1, h2, h3, h4, h5, h6, p, div') || question.element;
                insertRevealButton(fallbackElement, question);
                return;
            }
            
            // Insert button after question text element
            insertRevealButton(questionTextElement, question);
        });
    }

    // Helper function to insert Reveal button
    function insertRevealButton(insertAfterElement, question) {
        // Check if button already exists
        if (insertAfterElement.parentElement.querySelector('.quiz-solver-reveal-btn')) return;
        
        // Create Reveal button
        const button = document.createElement('button');
        button.className = 'quiz-solver-reveal-btn';
        button.textContent = 'Reveal Answer';
        button.style.cssText = `
            margin: 10px 0;
            padding: 8px 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            font-family: inherit;
            display: inline-block;
        `;
        
        // Add hover effect
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#1976D2';
            }
        });
        button.addEventListener('mouseleave', () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#2196F3';
            }
        });
        
        // Add click handler
        button.addEventListener('click', async () => {
            await handleRevealClick(button, question);
        });
        
        // Insert button after the element
        if (insertAfterElement.nextSibling) {
            insertAfterElement.parentNode.insertBefore(button, insertAfterElement.nextSibling);
        } else {
            insertAfterElement.parentNode.appendChild(button);
        }
    }

    // Handle Reveal button click
    async function handleRevealClick(button, question) {
        const aiService = await getAIService();
        if (!aiService) {
            alert('AI service not available. Please check your settings.');
            return;
        }
        
        if (!aiService.hasApiKey()) {
            chrome.storage.sync.get(['aiProvider'], (result) => {
                const provider = result.aiProvider || 'openai';
                const providerName = provider === 'openai' ? 'OpenAI' : 'Gemini';
                alert(`${providerName} API key not configured. Please set it in extension settings.\n\nClick the extension icon and go to Settings.`);
            });
            chrome.runtime.sendMessage({ action: 'openSettings' });
            return;
        }
        
        // Disable button and show loading
        button.disabled = true;
        button.textContent = 'Loading...';
        button.style.opacity = '0.6';
        
        try {
            const result = await aiService.getAnswer(question);
            highlightCorrectAnswers(question, result.correctAnswers, result.explanation);
            
            // Update button
            button.textContent = 'Revealed ✓';
            button.style.backgroundColor = '#4CAF50';
            button.disabled = true;
        } catch (error) {
            console.error('[Quiz Solver] Error getting answer:', error);
            alert(`Error: ${error.message}`);
            button.disabled = false;
            button.textContent = 'Reveal Answer';
            button.style.opacity = '1';
        }
    }

    // Highlight correct answers on the page
    function highlightCorrectAnswers(question, correctAnswerLetters, explanation) {
        question.answers.forEach((answer, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D...
            
            if (correctAnswerLetters.includes(letter)) {
                // Find the answer element to highlight
                let answerElement = answer.element;
                
                // Try to find the label or parent container
                const label = answerElement.closest('label') || 
                             document.querySelector(`label[for="${answerElement.id}"]`) ||
                             answerElement.parentElement;
                
                if (label) {
                    // Remove existing checkmark if present
                    const existingCheckmark = label.querySelector('.quiz-solver-checkmark');
                    if (existingCheckmark) {
                        existingCheckmark.remove();
                    }
                    
                    // Add checkmark only (no background/border)
                    const checkmark = document.createElement('span');
                    checkmark.textContent = ' ✓';
                    checkmark.style.cssText = `
                        color: #28a745;
                        font-weight: bold;
                        margin-left: 5px;
                        font-size: 16px;
                    `;
                    
                    checkmark.className = 'quiz-solver-checkmark';
                    label.appendChild(checkmark);
                }
                
                // Also check the input
                answerElement.style.accentColor = '#28a745';
            }
        });
        
        // Show explanation if available
        if (explanation) {
            const questionElement = question.element.querySelector('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content') ||
                                  question.element;
            
            if (questionElement) {
                // Remove existing explanation
                const existingExplanation = questionElement.parentElement.querySelector('.quiz-solver-explanation');
                if (existingExplanation) {
                    existingExplanation.remove();
                }
                
                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'quiz-solver-explanation';
                explanationDiv.style.cssText = `
                    margin: 10px 0;
                    padding: 10px;
                    background-color: #e3f2fd;
                    border-left: 4px solid #2196F3;
                    border-radius: 4px;
                    font-size: 13px;
                    color: #1976d2;
                `;
                explanationDiv.innerHTML = `<strong>Explanation:</strong> ${explanation}`;
                
                // Insert after the reveal button
                const revealButton = questionElement.parentElement.querySelector('.quiz-solver-reveal-btn');
                if (revealButton && revealButton.nextSibling) {
                    revealButton.parentNode.insertBefore(explanationDiv, revealButton.nextSibling);
                } else if (revealButton) {
                    revealButton.parentNode.appendChild(explanationDiv);
                }
            }
        }
    }

    // Use MutationObserver to detect dynamically loaded content
    function observeForQuestions() {
        if (typeof QuestionDetector === 'undefined') {
            console.warn('[Quiz Solver] Cannot start MutationObserver: QuestionDetector not available');
            return null;
        }

        debugLog('Starting MutationObserver for dynamic content...');

        // Stop existing observer if any
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        const detector = new QuestionDetector();
        let lastQuestionCount = 0;
        let checkCount = 0;
        
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            let detectedElements = [];
            
            mutations.forEach((mutation) => {
                // Check if new nodes were added that might contain questions
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const hasInputs = node.querySelectorAll?.('input[type="checkbox"], input[type="radio"]').length > 0;
                        const hasQuestionText = node.textContent?.match(/Question\s+\d+/i);
                        // Check for Docebo-specific elements
                        const hasDoceboAttr = node.hasAttribute?.('dcbshquestioncontent') || 
                                             node.classList?.contains('dcb-course-lesson-questions-question-content') ||
                                             node.id?.startsWith('dcb-sh-question-');
                        const hasDoceboChildren = node.querySelectorAll?.('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content, [id^="dcb-sh-question-"]').length > 0;
                        
                        if (hasInputs || hasQuestionText || hasDoceboAttr || hasDoceboChildren) {
                            shouldCheck = true;
                            detectedElements.push({
                                tag: node.tagName,
                                id: node.id,
                                classes: Array.from(node.classList || []),
                                hasDoceboAttr,
                                hasInputs: !!hasInputs
                            });
                        }
                    }
                });
            });
            
            if (shouldCheck) {
                checkCount++;
                debugLog(`MutationObserver detected potential question content (check #${checkCount}):`, detectedElements);
                // Debounce: wait a bit for content to settle
                setTimeout(() => {
                    const questions = detector.detectQuestions();
                    if (questions.length > lastQuestionCount) {
                        lastQuestionCount = questions.length;
                        window.quizSolverQuestions = questions;
                        
                        // Add Reveal All button if not exists
                        if (!document.querySelector('.quiz-solver-reveal-all-btn')) {
                            addRevealAllButton(questions);
                        }
                        
                        // Add Reveal buttons to new questions
                        addRevealButtons(questions);
                        
                        window.dispatchEvent(new CustomEvent('quizSolver:questionsDetected', {
                            detail: { questions }
                        }));
                        console.log(`%c[Quiz Solver] Updated: Now ${questions.length} question(s) detected`, 
                            'color: #4CAF50; font-weight: bold;');
                    } else if (questions.length > 0) {
                        debugLog(`Still ${questions.length} question(s) (no change)`);
                    }
                }, 500);
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        debugLog('MutationObserver started and observing document.body');
        mutationObserver = observer;
        return observer;
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extensionStateChanged') {
            isExtensionEnabled = request.enabled;
            if (isExtensionEnabled) {
                startExtension();
            } else {
                stopExtension();
            }
            sendResponse({ success: true });
        } else if (request.action === 'debugLoggingChanged') {
            debugLoggingEnabled = request.enabled;
            debugLog('Debug logging', debugLoggingEnabled ? 'enabled' : 'disabled');
            sendResponse({ success: true });
        }
    });

    // Initialize when DOM is ready
    checkDebugLogging(() => {
        debugLog('Page URL:', window.location.href);
        debugLog('Document ready state:', document.readyState);
        
        checkExtensionEnabled((enabled) => {
            if (enabled) {
                debugLog('Extension is enabled, starting initialization...');
                if (document.readyState === 'loading') {
                    debugLog('Document still loading, waiting for DOMContentLoaded...');
                    document.addEventListener('DOMContentLoaded', () => {
                        debugLog('DOMContentLoaded fired');
                        startExtension();
                    });
                } else {
                    debugLog('Document already loaded, starting immediately...');
                    startExtension();
                }
            } else {
                // Extension is disabled - exit early, no overhead
                debugLog('Extension is disabled. Exiting content script.');
            }
        });
    });

    // Export function to manually trigger detection (useful for extension popup)
    window.quizSolverDetectQuestions = function() {
        debugLog('Manual detection triggered via quizSolverDetectQuestions()');
        if (!isExtensionEnabled) {
            debugLog('Extension is disabled, returning empty array');
            return [];
        }
        if (typeof QuestionDetector === 'undefined') {
            console.error('[Quiz Solver] ERROR: QuestionDetector not loaded');
            return [];
        }
        const detector = new QuestionDetector();
        const questions = detector.detectQuestions();
        debugLog(`Manual detection found ${questions.length} question(s)`);
        return questions;
    };
})();


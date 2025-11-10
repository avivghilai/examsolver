/**
 * Flexible Quiz Question Detector
 * 
 * This module provides a robust way to detect quiz questions and their answer options
 * across different DOM structures. It uses multiple detection strategies to handle
 * various quiz platform implementations.
 */

class QuestionDetector {
    constructor() {
        this.strategies = [
            this.detectByDoceboStructure,  // Docebo-specific (highest priority)
            this.detectByQuestionNumberPattern,
            this.detectByCheckboxGrouping,
            this.detectByRadioGrouping,
            this.detectBySemanticHTML,
            this.detectByDataAttributes
        ];
        this.debugLoggingEnabled = false;
        this.initDebugLogging();
    }

    // Initialize debug logging state
    async initDebugLogging() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.get(['debugLogging'], (result) => {
                this.debugLoggingEnabled = result.debugLogging === true;
            });
        }
    }

    // Debug logging utility
    debugLog(...args) {
        if (this.debugLoggingEnabled) {
            console.log('[Quiz Solver]', ...args);
        }
    }

    /**
     * Main method to detect all questions on the page
     * @returns {Array} Array of question objects with text and answers
     */
    detectQuestions() {
        const questions = [];
        const processedElements = new WeakSet();

        // Try each detection strategy
        for (const strategy of this.strategies) {
            const found = strategy.call(this);
            for (const question of found) {
                if (!processedElements.has(question.element)) {
                    processedElements.add(question.element);
                    questions.push(question);
                }
            }
        }

        // Remove duplicates and merge results
        return this.deduplicateQuestions(questions);
    }

    /**
     * Strategy 1: Detect Docebo-specific question structure
     * Docebo uses: <div dcbshquestioncontent="" class="dcb-course-lesson-questions-question-content">
     */
    detectByDoceboStructure() {
        const questions = [];
        const processedContainers = new WeakSet();
        
        this.debugLog('Docebo detection: Looking for question containers...');
        
        // First, let's see what's actually in the DOM
        this.debugLog('DOM exploration:');
        this.debugLog('  - All elements with "dcb" in class:', document.querySelectorAll('[class*="dcb"]').length);
        this.debugLog('  - All elements with "question" in class:', document.querySelectorAll('[class*="question"]').length);
        this.debugLog('  - All elements with "dcbshquestioncontent" attribute:', document.querySelectorAll('[dcbshquestioncontent]').length);
        this.debugLog('  - All elements with class containing "dcb-course-lesson":', document.querySelectorAll('[class*="dcb-course-lesson"]').length);
        
        // Look for Docebo question containers by ID pattern (most reliable)
        // Docebo uses IDs like: dcb-sh-question-50-content
        try {
            const idContainers = document.querySelectorAll('[id^="dcb-sh-question-"]');
            this.debugLog(`Found ${idContainers.length} elements with dcb-sh-question- ID pattern`);
            
            // Also try without the exact prefix match
            const allDcbIds = Array.from(document.querySelectorAll('[id*="dcb"]')).filter(el => 
                el.id.includes('question') || el.id.includes('quiz')
            );
            this.debugLog(`Found ${allDcbIds.length} elements with "dcb" and "question"/"quiz" in ID`);
            if (allDcbIds.length > 0 && this.debugLoggingEnabled) {
                allDcbIds.slice(0, 5).forEach((el, i) => {
                    this.debugLog(`  [${i + 1}] ID: ${el.id}, classes: ${Array.from(el.classList).join(', ')}`);
                });
            }
            
            idContainers.forEach((element, index) => {
                // This should be the main question container
                if (processedContainers.has(element)) return;
                
                const hasQuestionText = element.querySelector('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
                const inputs = element.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                const hasAnswers = inputs.length >= 2;
                
                this.debugLog(`Container ${index + 1} (${element.id}):`, {
                    hasQuestionText: !!hasQuestionText,
                    inputCount: inputs.length,
                    hasAnswers
                });
                
                // Check if this container has multiple question divs (too large - contains multiple questions)
                const questionDivs = element.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
                const hasMultipleQuestions = questionDivs.length > 1;
                
                if (hasMultipleQuestions) {
                    this.debugLog(`Skipping container ${index + 1} - contains ${questionDivs.length} question divs (too large)`);
                    return;
                }
                
                // Skip containers with too many answers (likely contains multiple questions' answers)
                if (inputs.length > 10) {
                    this.debugLog(`Skipping container ${index + 1} - too many answers (${inputs.length})`);
                    return;
                }
                
                if (hasQuestionText && hasAnswers) {
                    const question = this.extractQuestionData(element);
                    
                    this.debugLog(`Extracted question from container ${index + 1}:`, {
                        hasQuestion: !!question,
                        questionText: question?.questionText?.substring(0, 50),
                        answerCount: question?.answers?.length
                    });
                    
                    if (question && question.answers.length >= 2 && question.questionText) {
                        // More strict validation
                        const questionTextLower = question.questionText.toLowerCase();
                        
                        // Skip if it's just a list of answers
                        const isAnswerList = questionTextLower.split(/\s+/).length <= 5 && 
                                            !questionTextLower.includes('?') &&
                                            !questionTextLower.match(/\b(what|which|how|why|when|where|who|are|is|does|do)\b/i);
                        
                        // Skip if question text matches multiple answers
                        const matchesMultipleAnswers = question.answers.filter(answer => 
                            questionTextLower.includes(answer.text.toLowerCase().substring(0, 10))
                        ).length >= 2;
                        
                        const isLikelyAnswer = questionTextLower.length < 20 && 
                                             !questionTextLower.includes('?') &&
                                             !questionTextLower.match(/\b(what|which|how|why|when|where|who)\b/i);
                        
                        if (!isLikelyAnswer && !isAnswerList && !matchesMultipleAnswers) {
                            processedContainers.add(element);
                            questions.push(question);
                            this.debugLog(`Added question from container ${index + 1}`);
                        } else {
                            this.debugLog(`Skipped container ${index + 1} - validation failed:`, {
                                isLikelyAnswer,
                                isAnswerList,
                                matchesMultipleAnswers
                            });
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('[Quiz Solver] Docebo ID-based detection error:', e);
        }
        
        // Fallback: Look for question content divs and find their containers
        try {
            // Try multiple selector strategies
            const selectors = [
                '[dcbshquestioncontent]',
                '.dcb-course-lesson-questions-question-content',
                '[class*="dcb-course-lesson-questions-question"]',
                '[class*="dcb"][class*="question"]'
            ];
            
            let contentDivs = [];
            selectors.forEach(selector => {
                try {
                    const found = document.querySelectorAll(selector);
                    this.debugLog(`Selector "${selector}" found ${found.length} elements`);
                    if (found.length > 0) {
                        contentDivs = Array.from(found);
                    }
                } catch (e) {
                    this.debugLog(`Selector "${selector}" failed:`, e);
                }
            });
            
            // Remove duplicates
            contentDivs = [...new Set(contentDivs)];
            this.debugLog(`Total unique Docebo question content divs: ${contentDivs.length}`);
            
            if (contentDivs.length > 0 && this.debugLoggingEnabled) {
                contentDivs.slice(0, 3).forEach((el, i) => {
                    this.debugLog(`Sample content div ${i + 1}:`, {
                        id: el.id,
                        classes: Array.from(el.classList),
                        hasAttr: el.hasAttribute('dcbshquestioncontent'),
                        textPreview: el.textContent.substring(0, 100),
                        parentId: el.parentElement?.id,
                        parentClasses: el.parentElement ? Array.from(el.parentElement.classList) : []
                    });
                });
            }
            
            contentDivs.forEach((element, index) => {
                // Try multiple strategies to find the container, but be more precise
                let container = element.closest('[id^="dcb-sh-question-"]');
                
                // If no ID-based container, look for parent with inputs, but limit scope
                if (!container) {
                    let parent = element.parentElement;
                    let depth = 0;
                    while (parent && depth < 5) {
                        // Check if this parent has multiple question content divs (means it's too large)
                        const questionDivs = parent.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
                        if (questionDivs.length > 1) {
                            // This container has multiple questions, skip it
                            break;
                        }
                        
                        const inputs = parent.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                        // Limit to reasonable number of answers (most questions have 2-6 options)
                        if (inputs.length >= 2 && inputs.length <= 10) {
                            container = parent;
                            break;
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                }
                
                // If still no container, use the element itself if it has inputs
                if (!container) {
                    const inputs = element.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                    if (inputs.length >= 2 && inputs.length <= 10) {
                        container = element;
                    }
                }
                
                if (container && !processedContainers.has(container)) {
                    const inputs = container.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                    const hasAnswers = inputs.length >= 2;
                    
                    // Check if this container has multiple question divs (too large)
                    const questionDivs = container.querySelectorAll('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
                    const hasMultipleQuestions = questionDivs.length > 1;
                    
                    this.debugLog(`Content div ${index + 1} container:`, {
                        containerId: container.id,
                        containerTag: container.tagName,
                        containerClasses: Array.from(container.classList),
                        inputCount: inputs.length,
                        hasAnswers,
                        questionDivsCount: questionDivs.length,
                        hasMultipleQuestions
                    });
                    
                    // Skip containers that have multiple questions (they're too large)
                    if (hasMultipleQuestions) {
                        this.debugLog(`Skipping container ${index + 1} - contains multiple questions`);
                        return;
                    }
                    
                    // Skip containers with too many answers (likely contains multiple questions' answers)
                    if (inputs.length > 10) {
                        this.debugLog(`Skipping container ${index + 1} - too many answers (${inputs.length})`);
                        return;
                    }
                    
                    if (hasAnswers) {
                        const question = this.extractQuestionData(container);
                        if (question && question.answers.length >= 2 && question.questionText) {
                            // More strict validation - filter out answer-only elements
                            const questionTextLower = question.questionText.toLowerCase();
                            
                            // Skip if it's just a list of answers (like "Subject Object Access permission")
                            const isAnswerList = questionTextLower.split(/\s+/).length <= 5 && 
                                                !questionTextLower.includes('?') &&
                                                !questionTextLower.match(/\b(what|which|how|why|when|where|who|are|is|does|do)\b/i);
                            
                            // Skip if question text matches multiple answers (it's probably just listing them)
                            const matchesMultipleAnswers = question.answers.filter(answer => 
                                questionTextLower.includes(answer.text.toLowerCase().substring(0, 10))
                            ).length >= 2;
                            
                            const isLikelyAnswer = questionTextLower.length < 20 && 
                                                 !questionTextLower.includes('?') &&
                                                 !questionTextLower.match(/\b(what|which|how|why|when|where|who)\b/i);
                            
                            if (!isLikelyAnswer && !isAnswerList && !matchesMultipleAnswers) {
                                processedContainers.add(container);
                                questions.push(question);
                                this.debugLog(`Added question from content div ${index + 1}`);
                            } else {
                                this.debugLog(`Skipped content div ${index + 1} - validation failed:`, {
                                    isLikelyAnswer,
                                    isAnswerList,
                                    matchesMultipleAnswers
                                });
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('[Quiz Solver] Docebo content-based detection error:', e);
        }

        this.debugLog(`Docebo detection found ${questions.length} question(s)`);
        return questions;
    }

    /**
     * Strategy 2: Detect by "Question X of Y" pattern
     * This matches the pattern shown in the image: "Question 1 of 20 (required)"
     */
    detectByQuestionNumberPattern() {
        const questions = [];
        const questionNumberRegex = /Question\s+(\d+)\s+of\s+(\d+)/i;
        
        // Find all text nodes or elements containing "Question X of Y"
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent || node.innerText || '';
            const match = text.match(questionNumberRegex);
            
            if (match) {
                const questionElement = this.findQuestionContainer(node);
                if (questionElement) {
                    const question = this.extractQuestionData(questionElement);
                    if (question) {
                        question.questionNumber = parseInt(match[1]);
                        question.totalQuestions = parseInt(match[2]);
                        questions.push(question);
                    }
                }
            }
        }

        return questions;
    }

    /**
     * Strategy 2: Detect by grouping checkboxes/radios that belong together
     * Questions typically have multiple input elements grouped together
     */
    detectByCheckboxGrouping() {
        const questions = [];
        const allInputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        
        // Group inputs by their common ancestor
        const inputGroups = new Map();
        
        allInputs.forEach(input => {
            const container = this.findQuestionContainer(input);
            if (container) {
                const key = container;
                if (!inputGroups.has(key)) {
                    inputGroups.set(key, []);
                }
                inputGroups.get(key).push(input);
            }
        });

        // Each group with 2+ inputs is likely a question
        inputGroups.forEach((inputs, container) => {
            if (inputs.length >= 2) {
                const question = this.extractQuestionData(container);
                if (question && question.answers.length >= 2) {
                    questions.push(question);
                }
            }
        });

        return questions;
    }

    /**
     * Strategy 3: Detect by radio button groups (single-select questions)
     */
    detectByRadioGrouping() {
        const questions = [];
        const radioGroups = new Map();
        
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            const name = radio.name || radio.getAttribute('name');
            if (name) {
                if (!radioGroups.has(name)) {
                    radioGroups.set(name, []);
                }
                radioGroups.get(name).push(radio);
            }
        });

        radioGroups.forEach((radios, name) => {
            if (radios.length >= 2) {
                const container = this.findQuestionContainer(radios[0]);
                if (container) {
                    const question = this.extractQuestionData(container);
                    if (question) {
                        questions.push(question);
                    }
                }
            }
        });

        return questions;
    }

    /**
     * Strategy 4: Detect by semantic HTML (fieldset, question-like classes)
     */
    detectBySemanticHTML() {
        const questions = [];
        
        // Look for fieldsets (common for form questions)
        document.querySelectorAll('fieldset').forEach(fieldset => {
            const question = this.extractQuestionData(fieldset);
            if (question && question.answers.length >= 2) {
                questions.push(question);
            }
        });

        // Look for elements with question-like class names
        const questionSelectors = [
            '[class*="question"]',
            '[class*="quiz-item"]',
            '[class*="quiz-question"]',
            '[id*="question"]',
            '[data-question]',
            '[data-quiz-item]'
        ];

        questionSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    const question = this.extractQuestionData(element);
                    if (question && question.answers.length >= 2) {
                        questions.push(question);
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });

        return questions;
    }

    /**
     * Strategy 5: Detect by data attributes (modern frameworks often use these)
     */
    detectByDataAttributes() {
        const questions = [];
        
        const dataSelectors = [
            '[data-question-id]',
            '[data-quiz-question]',
            '[data-testid*="question"]',
            '[data-cy*="question"]'
        ];

        dataSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    const question = this.extractQuestionData(element);
                    if (question && question.answers.length >= 2) {
                        questions.push(question);
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });

        return questions;
    }

    /**
     * Find the container element that likely contains a question
     * @param {Node} node - Starting node
     * @returns {Element|null} Container element or null
     */
    findQuestionContainer(node) {
        let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        
        // Walk up the DOM tree looking for a likely container
        while (element && element !== document.body) {
            // Check if this element looks like a question container
            if (this.isLikelyQuestionContainer(element)) {
                return element;
            }
            element = element.parentElement;
        }

        // Fallback: find nearest common ancestor with multiple inputs
        const inputs = node.nodeType === Node.TEXT_NODE 
            ? node.parentElement?.querySelectorAll('input[type="checkbox"], input[type="radio"]')
            : node.querySelectorAll('input[type="checkbox"], input[type="radio"]');
        
        if (inputs && inputs.length >= 2) {
            return this.findCommonAncestor(Array.from(inputs));
        }

        return null;
    }

    /**
     * Check if an element looks like a question container
     */
    isLikelyQuestionContainer(element) {
        if (!element || !element.classList) return false;

        const classList = Array.from(element.classList);
        const id = element.id || '';
        const text = element.textContent || '';

        // Check for question indicators
        const hasQuestionClass = classList.some(cls => 
            /question|quiz|item|card|panel/i.test(cls)
        );
        
        const hasQuestionId = /question|quiz|item/i.test(id);
        const hasQuestionText = /Question\s+\d+/i.test(text);
        const hasMultipleInputs = element.querySelectorAll('input[type="checkbox"], input[type="radio"]').length >= 2;
        
        // Docebo-specific checks
        const hasDoceboAttr = element.hasAttribute('dcbshquestioncontent');
        const hasDoceboClass = classList.some(cls => /dcb-course-lesson-questions/i.test(cls));
        const hasDoceboId = id.startsWith('dcb-sh-question-');

        return hasQuestionClass || hasQuestionId || (hasQuestionText && hasMultipleInputs) || 
               hasDoceboAttr || hasDoceboClass || hasDoceboId;
    }

    /**
     * Extract question data from a container element
     * @param {Element} container - Container element
     * @returns {Object|null} Question object or null
     */
    extractQuestionData(container) {
        if (!container) return null;

        const questionText = this.extractQuestionText(container);
        const answers = this.extractAnswers(container);

        if (!questionText || answers.length < 2) {
            return null;
        }

        // Additional validation: filter out answer-only elements
        // If the question text is the same as one of the answers, it's likely just an answer option
        const questionTextLower = questionText.toLowerCase().trim();
        const isAnswerDuplicate = answers.some(answer => 
            answer.text.toLowerCase().trim() === questionTextLower
        );
        
        if (isAnswerDuplicate) {
            this.debugLog('Skipping - question text matches an answer:', questionText.substring(0, 50));
            return null;
        }
        
        // Log successful extraction for debugging
        this.debugLog('Extracted question:', {
            text: questionText.substring(0, 80),
            answerCount: answers.length
        });

        return {
            element: container,
            questionText: questionText.trim(),
            answers: answers,
            questionNumber: null,
            totalQuestions: null
        };
    }

    /**
     * Extract the question text from a container
     */
    extractQuestionText(container) {
        // Try to find question text by various methods
        
        // Method 0: Docebo-specific question text extraction
        const doceboQuestionText = container.querySelector('[dcbshquestioncontent], .dcb-course-lesson-questions-question-content');
        if (doceboQuestionText) {
            const text = this.cleanText(doceboQuestionText.textContent);
            // Remove "quiz 1:" prefix if present
            let cleaned = text.replace(/^quiz\s+\d+:\s*/i, '').trim();
            // Remove "Question X of Y" prefix if present
            cleaned = cleaned.replace(/^Question\s+\d+\s+of\s+\d+[:\s]*/i, '').trim();
            if (cleaned && cleaned.length > 10) {
                return cleaned;
            }
        }
        
        // Method 1: Look for elements with question-like classes
        const questionTextSelectors = [
            '[class*="question-text"]',
            '[class*="question-title"]',
            '[class*="question-label"]',
            '[dcbshquestioncontent]',
            '.dcb-course-lesson-questions-question-content',
            'h1, h2, h3, h4, h5, h6',
            'p:first-of-type',
            'label:first-of-type'
        ];

        for (const selector of questionTextSelectors) {
            try {
                const element = container.querySelector(selector);
                if (element) {
                    const text = this.cleanText(element.textContent);
                    if (text && text.length > 10) { // Reasonable question length
                        return text;
                    }
                }
            } catch (e) {
                // Invalid selector
            }
        }

        // Method 2: Get text before the first input
        const firstInput = container.querySelector('input[type="checkbox"], input[type="radio"]');
        if (firstInput) {
            const textBefore = this.getTextBeforeElement(container, firstInput);
            if (textBefore && textBefore.length > 10) {
                return textBefore;
            }
        }

        // Method 3: Get all text and filter out answer text
        const allText = container.textContent || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
        
        // First substantial line that's not an answer is likely the question
        for (const line of lines) {
            if (line.length > 10 && !this.looksLikeAnswer(line)) {
                return line;
            }
        }

        return null;
    }

    /**
     * Extract answer options from a container
     */
    extractAnswers(container) {
        const answers = [];
        const inputs = container.querySelectorAll('input[type="checkbox"], input[type="radio"]');

        inputs.forEach(input => {
            const answerText = this.getAnswerText(input);
            if (answerText) {
                const cleaned = answerText.trim();
                
                // Filter out invalid answers
                if (cleaned.toLowerCase() === 'null' || 
                    cleaned === '' ||
                    cleaned.toLowerCase().includes('terminate the subscription') ||
                    cleaned.toLowerCase().includes('renew the subscription') ||
                    cleaned.length < 2) {
                    return; // Skip this answer
                }
                
                answers.push({
                    element: input,
                    text: cleaned,
                    isSelected: input.checked,
                    value: input.value || cleaned
                });
            }
        });

        return answers;
    }

    /**
     * Get the text associated with an answer input
     */
    getAnswerText(input) {
        // Method 1: Associated label
        const id = input.id;
        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) {
                return this.cleanText(label.textContent);
            }
        }

        // Method 2: Parent label
        const parentLabel = input.closest('label');
        if (parentLabel) {
            return this.cleanText(parentLabel.textContent);
        }

        // Method 3: Next sibling text
        let sibling = input.nextSibling;
        while (sibling) {
            if (sibling.nodeType === Node.TEXT_NODE) {
                const text = this.cleanText(sibling.textContent);
                if (text) return text;
            } else if (sibling.nodeType === Node.ELEMENT_NODE) {
                const text = this.cleanText(sibling.textContent);
                if (text) return text;
            }
            sibling = sibling.nextSibling;
        }

        // Method 4: Parent container text (fallback)
        const parent = input.parentElement;
        if (parent) {
            const text = this.cleanText(parent.textContent);
            // Remove the input value from text if present
            return text.replace(input.value, '').trim();
        }

        return input.value || '';
    }

    /**
     * Get text content before a specific element
     */
    getTextBeforeElement(container, element) {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        const texts = [];
        let found = false;

        while (node = walker.nextNode()) {
            if (node === element || element.contains(node)) {
                found = true;
                break;
            }
            if (!found) {
                const text = this.cleanText(node.textContent);
                if (text) {
                    texts.push(text);
                }
            }
        }

        return texts.join(' ');
    }

    /**
     * Check if text looks like an answer option
     */
    looksLikeAnswer(text) {
        // Answers are typically short and might be in lists
        const shortAnswers = text.length < 50;
        const isListItem = /^[a-zA-Z]\)|^[0-9]+\.|^[-•*]/.test(text.trim());
        return shortAnswers || isListItem;
    }

    /**
     * Clean text content
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();
    }

    /**
     * Find common ancestor of multiple elements
     */
    findCommonAncestor(elements) {
        if (elements.length === 0) return null;
        if (elements.length === 1) return elements[0].parentElement;

        let ancestor = elements[0].parentElement;
        while (ancestor) {
            if (elements.every(el => ancestor.contains(el))) {
                return ancestor;
            }
            ancestor = ancestor.parentElement;
        }
        return document.body;
    }

    /**
     * Remove duplicate questions and filter out answer-only elements
     */
    deduplicateQuestions(questions) {
        const seen = new Map();
        const unique = [];
        const answerTexts = new Set();

        // First pass: collect all answer texts to identify answer-only elements
        questions.forEach(q => {
            q.answers.forEach(answer => {
                answerTexts.add(answer.text.toLowerCase().trim());
            });
        });

        // Second pass: filter and deduplicate
        questions.forEach(q => {
            const questionTextLower = q.questionText.toLowerCase().trim();
            const key = questionTextLower.substring(0, 50);
            
            // Skip if we've seen this question before
            if (seen.has(key)) {
                return;
            }
            
            // Skip if the question text is actually just an answer option
            if (answerTexts.has(questionTextLower)) {
                this.debugLog('Dedup: Skipping - question text is an answer:', questionTextLower.substring(0, 50));
                return;
            }
            
            // Skip if question text is too short and doesn't look like a question (but be less strict)
            if (questionTextLower.length < 15 && !questionTextLower.includes('?') && !questionTextLower.match(/\b(what|which|how|why|when|where|who)\b/i)) {
                this.debugLog('Dedup: Skipping - too short:', questionTextLower.substring(0, 50));
                return;
            }
            
            // Skip if question text matches one of its own answers exactly
            const matchesOwnAnswer = q.answers.some(answer => 
                answer.text.toLowerCase().trim() === questionTextLower
            );
            if (matchesOwnAnswer) {
                this.debugLog('Dedup: Skipping - matches own answer:', questionTextLower.substring(0, 50));
                return;
            }
            
            seen.set(key, true);
            unique.push(q);
        });

        return unique;
    }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.QuestionDetector = QuestionDetector;
}


/**
 * OpenAI API Service
 * Handles communication with OpenAI API
 */

class OpenAIService {
    constructor() {
        this.apiKey = null;
        this.model = 'gpt-4o'; // Using GPT-4o (latest model, user said ChatGPT 5 but this is the latest)
    }

    /**
     * Initialize the service by loading API key from storage
     */
    async initialize() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['openaiApiKey'], (result) => {
                this.apiKey = result.openaiApiKey || null;
                resolve(!!this.apiKey);
            });
        });
    }

    /**
     * Check if API key is configured
     */
    hasApiKey() {
        return !!this.apiKey;
    }

    /**
     * Get answer for a question
     * @param {Object} question - Question object with questionText and answers
     * @returns {Promise<Object>} Response with correct answers and explanation
     */
    async getAnswer(question) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured. Please set it in extension settings.');
        }

        const prompt = this.formatQuestionForOpenAI(question);
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that answers quiz questions accurately. Analyze the question and determine which answer(s) are correct. Provide your response in JSON format with "correctAnswers" (array of letter indices like ["A", "B"]) and "explanation" (brief explanation).'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500,
                    response_format: { type: "json_object" }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.statusText}. ${errorData.error?.message || ''}`);
            }
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse JSON response
            try {
                const parsed = JSON.parse(content);
                return {
                    correctAnswers: parsed.correctAnswers || [],
                    explanation: parsed.explanation || 'No explanation provided'
                };
            } catch (e) {
                // Fallback: try to extract answers from text response
                return this.parseTextResponse(content, question.answers.length);
            }
        } catch (error) {
            console.error('[Quiz Solver] OpenAI API error:', error);
            throw error;
        }
    }

    /**
     * Format question for OpenAI API
     */
    formatQuestionForOpenAI(question) {
        const answersList = question.answers
            .map((answer, index) => {
                const letter = String.fromCharCode(65 + index);
                return `${letter}. ${answer.text}`;
            })
            .join('\n');
        
        return `Question: ${question.questionText}\n\nPossible answers:\n${answersList}\n\nWhich answer(s) is/are correct? Respond in JSON format: {"correctAnswers": ["A", "B"], "explanation": "brief explanation"}`;
    }

    /**
     * Parse text response if JSON parsing fails
     */
    parseTextResponse(text, answerCount) {
        const correctAnswers = [];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        // Try to find letter patterns in the response
        for (let i = 0; i < Math.min(answerCount, letters.length); i++) {
            const letter = letters[i];
            const regex = new RegExp(`\\b${letter}\\b`, 'i');
            if (regex.test(text)) {
                correctAnswers.push(letter);
            }
        }
        
        return {
            correctAnswers: correctAnswers.length > 0 ? correctAnswers : [],
            explanation: text.substring(0, 200)
        };
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.OpenAIService = OpenAIService;
}


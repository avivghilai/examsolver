/**
 * Google Gemini API Service
 * Handles communication with Google Gemini API
 */

class GeminiService {
    constructor() {
        this.apiKey = null;
        this.model = 'gemini-2.0-flash-exp'; // Default to Gemini 2.5 Flash
    }

    /**
     * Initialize the service by loading API key and model from storage
     */
    async initialize() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], (result) => {
                this.apiKey = result.geminiApiKey || null;
                // Default to Flash if not set
                this.model = result.geminiModel || 'gemini-2.5-flash';
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
            throw new Error('Gemini API key not configured. Please set it in extension settings.');
        }

        const prompt = this.formatQuestionForGemini(question);
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500,
                        responseMimeType: 'application/json'
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Gemini API error: ${response.statusText}. ${errorData.error?.message || ''}`);
            }
            
            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;
            
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
            console.error('[Quiz Solver] Gemini API error:', error);
            throw error;
        }
    }

    /**
     * Format question for Gemini API
     */
    formatQuestionForGemini(question) {
        const answersList = question.answers
            .map((answer, index) => {
                const letter = String.fromCharCode(65 + index);
                return `${letter}. ${answer.text}`;
            })
            .join('\n');
        
        return `You are a helpful assistant that answers quiz questions accurately. Analyze the question and determine which answer(s) are correct.

Question: ${question.questionText}

Possible answers:
${answersList}

Which answer(s) is/are correct? Respond in JSON format with "correctAnswers" (array of letter indices like ["A", "B"]) and "explanation" (brief explanation).

Response (JSON only):`;
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
    window.GeminiService = GeminiService;
}


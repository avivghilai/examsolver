# Quiz Solver - Chrome Extension

A Chrome extension that automatically detects quiz questions on web pages and helps you find the correct answers using OpenAI's GPT-4o.

## Features

- 🔍 **Automatic Question Detection**: Detects quiz questions across various platforms using multiple detection strategies
- 🤖 **AI-Powered Answers**: Uses OpenAI GPT-4o to determine correct answers
- ✅ **Visual Highlighting**: Highlights correct answers with green checkmarks
- 📝 **Explanations**: Shows brief explanations for each answer
- 🚀 **Reveal All**: One-click button to reveal all answers at once
- ⚙️ **Easy Setup**: Simple settings panel for API key configuration

## Installation

### Method 1: Load Unpacked Extension (Recommended)

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract the files if downloaded as ZIP

2. **Open Chrome Extensions Page**
   - Open Chrome and navigate to `chrome://extensions/`
   - Or go to: Menu (⋮) → Extensions → Manage Extensions

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `extension` folder from this repository
   - The extension should now appear in your extensions list

5. **Configure API Key**
   - Click the extension icon in the toolbar
   - If prompted, enter your OpenAI API key in the settings panel
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Click "Save"

### Method 2: Install from ZIP

1. Download the `quiz-solver-extension.zip` file from the `extension` folder
2. Extract the ZIP file
3. Follow steps 2-5 from Method 1 above

## Usage

1. **Navigate to a Quiz Page**
   - Visit any quiz page (works best with Docebo and similar platforms)
   - The extension automatically detects questions when the page loads

2. **Reveal Individual Answers**
   - Click the "Reveal Answer" button next to any question
   - Correct answers will be highlighted with green checkmarks (✓)
   - An explanation will appear below the question

3. **Reveal All Answers**
   - Click the "Reveal All Answers" button at the top of the quiz
   - All questions will be processed sequentially
   - Progress is shown in real-time

## Requirements

- **Chrome Browser** (or Chromium-based browser)
- **OpenAI API Key** (get one at [platform.openai.com](https://platform.openai.com/api-keys))
- **Internet Connection** (for API calls)

## Architecture

### Detection Strategies

The extension uses a **multi-strategy detection approach** to handle various quiz platform implementations:

1. **Docebo-Specific Detection**: Targets Docebo LMS structure with `dcbshquestioncontent` attributes
2. **Question Number Pattern**: Detects "Question X of Y" patterns
3. **Checkbox/Radio Grouping**: Groups related input elements
4. **Radio Button Groups**: Detects single-select questions
5. **Semantic HTML**: Uses semantic elements like `<fieldset>`
6. **Data Attributes**: Detects modern framework data attributes

### File Structure

```
extension/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic
├── settings.html              # Settings page (legacy, not used)
├── settings.js                # Settings logic (legacy, not used)
├── scripts/
│   ├── question-detector.js   # Core question detection engine
│   ├── openai-service.js      # OpenAI API integration
│   └── content.js             # Content script (runs on pages)
└── icons/                     # Extension icons (placeholder)
```

### Question Object Structure

Each detected question has the following structure:

```javascript
{
    element: HTMLElement,           // The container element
    questionText: string,            // The question text
    answers: [                      // Array of answer options
        {
            element: HTMLElement,   // The input element
            text: string,            // Answer text
            isSelected: boolean,     // Whether it's currently selected
            value: string           // Input value
        }
    ],
    questionNumber: number | null,  // Question number if detected
    totalQuestions: number | null   // Total questions if detected
}
```

## Configuration

### Setting Up OpenAI API Key

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click the extension icon
3. Click "⚙️ Settings" (or it will open automatically if no key is set)
4. Enter your API key (starts with `sk-`)
5. Click "Save"

**Note**: Your API key is stored locally in Chrome's sync storage and is never sent to any server except OpenAI.

## Supported Platforms

- ✅ **Docebo LMS** (primary target)
- ✅ Generic quiz platforms with standard HTML forms
- ✅ Platforms using semantic HTML (`<fieldset>`, etc.)
- ✅ Modern frameworks with data attributes

## Privacy & Security

- 🔒 API key is stored locally in Chrome sync storage
- 🔒 No data is sent to any server except OpenAI
- 🔒 All processing happens in your browser
- 🔒 No tracking or analytics

## Development

### Adding New Detection Strategies

You can extend the `QuestionDetector` class to add custom detection methods:

```javascript
class CustomQuestionDetector extends QuestionDetector {
    detectByCustomMethod() {
        const questions = [];
        // Your detection logic here
        return questions;
    }
    
    constructor() {
        super();
        this.strategies.push(this.detectByCustomMethod);
    }
}
```

### Building from Source

1. Clone the repository
2. Navigate to the `extension` folder
3. Load as unpacked extension in Chrome (see Installation above)
4. Make your changes
5. Reload the extension in `chrome://extensions/`

## Troubleshooting

**Questions not detected:**
- Make sure you're on a quiz page with visible questions
- Check the browser console (F12) for error messages
- Some quiz platforms load content dynamically - wait a few seconds

**API errors:**
- Verify your API key is correct and active
- Check your OpenAI account has available credits
- Ensure you have internet connectivity

**Extension not working:**
- Reload the extension in `chrome://extensions/`
- Check for errors in the extension's service worker
- Try reloading the quiz page

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Disclaimer

This extension is for educational purposes. Always follow your institution's academic integrity policies. Using this tool to cheat on exams or assessments may violate academic honesty policies.

## Acknowledgments

- Built with OpenAI GPT-4o
- Designed for Docebo LMS compatibility
- Uses Chrome Extension Manifest V3

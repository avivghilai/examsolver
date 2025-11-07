# Quiz Solver Chrome Extension

A Chrome extension that detects quiz questions and their answer options on web pages.

## Features

- **Multi-strategy question detection**: Uses 5 different strategies to detect questions across various quiz platforms
- **Dynamic content support**: Automatically detects questions loaded dynamically via JavaScript
- **Console logging**: Logs detected questions and answers to the browser console
- **Popup interface**: Simple popup to manually trigger detection

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this repository
5. The extension should now be installed and active

## Usage

### Automatic Detection

The extension automatically runs on pages matching:
- `*.docebosaas.com/*`
- Any page with "quiz" or "question" in the URL

When you visit a quiz page:
1. Open the browser console (F12 or Cmd+Option+I)
2. Look for `[Quiz Solver]` messages
3. Questions will be logged with formatted output showing:
   - Question number and text
   - All answer options
   - Currently selected answers (marked with ✓)

### Manual Detection via Popup

1. Click the extension icon in the Chrome toolbar
2. Click "Detect Questions" button
3. View detected questions in the popup

## File Structure

```
extension/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js           # Service worker for extension lifecycle
├── popup.html              # Extension popup UI
├── popup.js                # Popup script logic
├── scripts/
│   ├── question-detector.js  # Core question detection logic
│   └── content.js            # Content script that runs on pages
└── icons/                   # Extension icons (placeholder)
```

## Development

### Testing

1. Load the extension in developer mode
2. Visit a quiz page (e.g., Docebo quiz)
3. Check the browser console for detection logs
4. Use the popup to manually trigger detection

### Adding New Detection Strategies

Edit `scripts/question-detector.js` and add a new method to the `QuestionDetector` class:

```javascript
detectByCustomMethod() {
    const questions = [];
    // Your detection logic here
    return questions;
}
```

Then add it to the strategies array in the constructor:

```javascript
this.strategies = [
    // ... existing strategies
    this.detectByCustomMethod
];
```

## Permissions

- `storage`: For storing extension settings (future use)
- `activeTab`: To access the current tab's content
- `host_permissions`: To run on Docebo and quiz pages

## Future Enhancements

- [ ] OpenAI API integration for answer suggestions
- [ ] Highlight correct answers on the page
- [ ] Export questions/answers to JSON
- [ ] Settings page for API key configuration
- [ ] Support for more quiz platforms

## Troubleshooting

**No questions detected:**
- Make sure you're on a quiz page with visible questions
- Check the browser console for errors
- Try manually clicking "Detect Questions" in the popup
- Some quiz platforms load content very dynamically - wait a few seconds and try again

**Extension not working:**
- Verify the extension is enabled in `chrome://extensions/`
- Check for errors in the extension's service worker (click "service worker" link in extensions page)
- Reload the extension after making code changes

## License

MIT


# Quiz Examples

This directory contains example quiz HTML files for testing the Quiz Solver extension.

## Files

### 1. `quiz-example.html`
A standard quiz page with:
- 5 questions (mix of single and multiple choice)
- Standard HTML structure with radio buttons and checkboxes
- Questions numbered "Question X of Y"
- Clean, modern styling

**How to test:**
1. Open this file in Chrome
2. Enable the Quiz Solver extension in the popup
3. Click "Detect Questions" or wait for automatic detection
4. Use "Reveal Answer" buttons to test the extension

### 2. `docebo-quiz-example.html`
A Docebo-style quiz page that mimics the actual Docebo LMS structure:
- Uses Docebo-specific attributes (`dcbshquestioncontent`)
- Uses Docebo class names (`dcb-course-lesson-questions-question-content`)
- Uses Docebo ID patterns (`dcb-sh-question-X-content`)
- 3 questions with proper Docebo structure

**How to test:**
1. Open this file in Chrome
2. Enable the Quiz Solver extension in the popup
3. The extension should automatically detect questions (Docebo detection has highest priority)
4. Use "Reveal All Answers" or individual "Reveal Answer" buttons

## Testing Checklist

- [ ] Extension toggle works (enable/disable)
- [ ] Questions are detected automatically on page load
- [ ] "Detect Questions" button works from popup
- [ ] "Reveal Answer" buttons appear for each question
- [ ] "Reveal All Answers" button appears at the top
- [ ] Answers are highlighted correctly
- [ ] Explanations are shown (if provided by OpenAI)
- [ ] Extension cleans up UI when disabled
- [ ] Works on both standard and Docebo-style quizzes

## Notes

- Make sure you have configured your OpenAI API key in the extension settings
- The extension must be enabled via the toggle in the popup
- These are test pages - the answers shown by the extension come from OpenAI's API


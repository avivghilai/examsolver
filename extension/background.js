/**
 * Quiz Solver Background Service Worker
 * 
 * Handles extension lifecycle and message passing
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log('Quiz Solver extension installed');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getQuestions') {
        // Forward to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'detectQuestions' }, (response) => {
                    sendResponse(response);
                });
            }
        });
        return true; // Keep channel open for async response
    }
});


# How to Share the Quiz Solver Extension

## Method 1: Share as ZIP File (Recommended)

### Step 1: Prepare the Extension Folder

1. Make sure you're in the `extension` folder
2. Remove any unnecessary files:
   - `.git` folder (if present)
   - `.DS_Store` files (Mac)
   - Any test files or temporary files

### Step 2: Create ZIP File

**On Mac/Linux:**
```bash
cd extension
zip -r quiz-solver-extension.zip . -x "*.git*" "*.DS_Store" "*node_modules*"
```

**On Windows:**
1. Right-click the `extension` folder
2. Select "Send to" → "Compressed (zipped) folder"
3. Rename it to `quiz-solver-extension.zip`

### Step 3: Share the ZIP File

Send the ZIP file to your friend via:
- Email
- Cloud storage (Google Drive, Dropbox, etc.)
- File sharing service

### Step 4: Your Friend Installs It

1. Extract the ZIP file to a folder (e.g., `quiz-solver-extension`)
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extracted `quiz-solver-extension` folder
6. Done!

## Method 2: Create .crx File (Advanced)

### Step 1: Pack the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Pack extension"
4. Browse to your `extension` folder
5. Click "Pack Extension"
6. This creates:
   - `extension.crx` (the extension file)
   - `extension.pem` (private key - keep this secret!)

### Step 2: Share the .crx File

Send only the `.crx` file to your friend (NOT the `.pem` file).

### Step 3: Your Friend Installs It

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Drag and drop the `.crx` file onto the extensions page
4. Click "Add extension" when prompted

**Note:** Chrome may show a warning about installing extensions from outside the Chrome Web Store. This is normal for unpacked extensions.

## What Files to Include

Make sure these files are in the ZIP:
- ✅ `manifest.json`
- ✅ `background.js`
- ✅ `popup.html`
- ✅ `popup.js`
- ✅ `settings.html` (optional, not used but harmless)
- ✅ `settings.js` (optional, not used but harmless)
- ✅ `scripts/question-detector.js`
- ✅ `scripts/openai-service.js`
- ✅ `scripts/content.js`
- ✅ `icons/` folder (even if empty)

## What NOT to Include

- ❌ `.git/` folder
- ❌ `.DS_Store` files
- ❌ `node_modules/` (if you add any)
- ❌ `*.pem` files (private keys)
- ❌ Test files
- ❌ `DISTRIBUTION.md` (optional)

## Quick Checklist Before Sharing

- [ ] Extension works on your machine
- [ ] All required files are present
- [ ] No sensitive information (API keys, etc.) in the code
- [ ] ZIP file is created
- [ ] Test the ZIP by extracting and loading it yourself

## Troubleshooting

**Friend can't install:**
- Make sure they extracted the ZIP file first
- They need to enable "Developer mode"
- They should select the folder, not the ZIP file

**Extension doesn't work:**
- Check browser console for errors
- Make sure all files are in the folder
- Verify `manifest.json` is correct

## Alternative: Chrome Web Store (For Public Distribution)

If you want to distribute publicly, you can publish to Chrome Web Store:
1. Create a developer account ($5 one-time fee)
2. Zip the extension folder
3. Upload to Chrome Web Store Developer Dashboard
4. Submit for review

This is overkill for sharing with a friend, but good for wider distribution.


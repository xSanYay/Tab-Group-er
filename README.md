# Tab-Group-er

Auto-group your Chrome tabs using local AI with Transformers.js. Runs entirely in-browser using WebAssembly. Private, works on stable Chrome.

## How It Works

Uses zero-shot classification to categorize tabs into groups like Work, Social, Entertainment, etc. The AI model runs locally in a Web Worker, so your tab data never leaves your browser.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the root folder of this repository

## Usage

1. Click the extension icon
2. Click "Group Tabs with AI"
3. Wait for the model to load (first run downloads ~40MB)
4. Review and edit the suggested group names
5. Click "Apply Groups" to organize your tabs

## Project Structure

- `manifest.json` — Extension configuration and permissions
- `popup.html` — The user interface
- `popup.js` — UI logic and Chrome tabs API integration
- `worker.js` — Web Worker running Transformers.js for classification

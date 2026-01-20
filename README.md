# Tab-Group-er

Auto-group your Chrome tabs using local Gemini Nano AI. Completely private, offline, and zero-cost.

## 1. Enable Chrome's AI Engine

Before the extension can communicate with Gemini Nano, you must enable the experimental APIs:

### Flags
1. Go to `chrome://flags`
2. Enable **#optimization-guide-on-device-model** (Set to *Enabled BypassPerfRequirement*)
3. Enable **#prompt-api-for-gemini-nano** (Set to *Enabled*)
4. Relaunch Chrome

### Components
1. Go to `chrome://components`
2. Find **Optimization Guide On Device Model**
3. Click **Check for update** and wait for the download to finish (~1.5GB)

## 2. Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the root folder of this repository

## Project Structure

- `manifest.json` — Extension configuration and permissions
- `popup.html` — The user interface
- `popup.js` — The logic for collecting tabs and calling the `window.ai` API.

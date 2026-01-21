const SYSTEM_PROMPT = `You are a tab organizer.
Categorize these tabs into groups. 
Return ONLY valid JSON with format: {"GroupName": [id1, id2]} where ids are numbers. 
No markdown, no code blocks, just pure JSON and only JSON.`;

document.getElementById('groupBtn').addEventListener('click', async () => {
  console.log("Popup script started (v2)"); 
  const status = document.getElementById('status');
  
  // Use window.ai explicitly to avoid ReferenceError
  if (!window.ai) {
    status.innerText = "Global 'ai' object not found. Please enable chrome://flags/#prompt-api-for-gemini-nano";
    status.className = 'error';
    return;
  }

  // 1. Check capabilities and readiness
  const capabilities = await window.ai.languageModel.capabilities();
  
  if (capabilities.available === 'no') {
    status.innerText = "Local AI not available on this device.";
    status.className = 'error';
    return;
  }
  
  if (capabilities.available === 'after-download') {
    status.innerText = "Downloading AI model... (check chrome://components)";
    status.className = 'loading';
  } else {
    status.innerText = "AI is thinking locally...";
    status.className = 'loading';
  }

  try {
    // 2. Get current tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tabData = tabs.map(t => ({ id: t.id, title: t.title }));

    // 3. Initialize a session with a system prompt
    const session = await window.ai.languageModel.create({
      systemPrompt: SYSTEM_PROMPT
    });

    // 4. Prompt the model
    const response = await session.prompt(`Group these tabs: ${JSON.stringify(tabData)}`);
    
    // Clean up the response (sometimes AI wraps JSON in backticks)
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    const groups = JSON.parse(cleanedResponse);

    // 5. Execute the grouping in Chrome
    let groupedCount = 0;
    for (const [groupName, tabIds] of Object.entries(groups)) {
      if (tabIds.length > 0) {
        const numericIds = tabIds.map(id => typeof id === 'string' ? parseInt(id) : id);
        const groupId = await chrome.tabs.group({ tabIds: numericIds });
        await chrome.tabGroups.update(groupId, { title: groupName });
        groupedCount += numericIds.length;
      }
    }
    
    session.destroy(); // Free up memory
    status.innerText = `Organized ${groupedCount} tabs into ${Object.keys(groups).length} groups!`;
    status.className = 'success';
  } catch (err) {
    status.innerText = "Error: " + err.message;
    status.className = 'error';
    console.error(err);
  }
});

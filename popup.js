const DEFAULT_LABELS = ['Work', 'Social', 'Entertainment', 'Shopping', 'News', 'Finance', 'Development'];

// Initialize the labels input
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('labelsInput').value = DEFAULT_LABELS.join(', ');
});

let classifier = null;
let currentGroups = {};

async function getLabels() {
  const input = document.getElementById('labelsInput').value;
  let customLabels = input.split(',').map(l => l.trim()).filter(l => l.length > 0);
  
  // Make it "smarter" by adding existing group names from the browser
  try {
    const existingGroups = await chrome.tabGroups.query({});
    const groupTitles = existingGroups.map(g => g.title).filter(t => t && t.length > 0);
    // Merge and remove duplicates
    const finalLabels = [...new Set([...customLabels, ...groupTitles])];
    return finalLabels.length > 0 ? finalLabels : DEFAULT_LABELS;
  } catch (e) {
    return customLabels.length > 0 ? customLabels : DEFAULT_LABELS;
  }
}

async function loadTransformers() {
  if (!classifier) {
    const { pipeline } = await import('./transformers.min.js');
    classifier = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall', { dtype: 'q8' });
  }
  return classifier;
}

function setStatus(text, type = '') {
  const status = document.getElementById('status');
  status.innerText = text;
  status.className = type;
}

function renderEditView(groups) {
  const container = document.getElementById('edit-container');
  container.innerHTML = '';
  container.style.display = 'block';
  document.getElementById('options-container').style.display = 'none';
  
  Object.entries(groups).forEach(([name, tabs]) => {
    if (tabs.length === 0) return;
    
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-item';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = name;
    input.className = 'group-name-input';
    input.dataset.originalName = name;
    
    const list = document.createElement('ul');
    list.className = 'tab-list';
    tabs.forEach(tab => {
      const li = document.createElement('li');
      li.textContent = tab.title || 'Untitled';
      li.title = tab.title;
      list.appendChild(li);
    });
    
    groupDiv.appendChild(input);
    groupDiv.appendChild(list);
    container.appendChild(groupDiv);
  });
  
  document.getElementById('doneBtn').style.display = 'block';
  document.getElementById('groupBtn').style.display = 'none';
  document.getElementById('duplicateBtn').style.display = 'none';
}

async function applyGroups() {
  const container = document.getElementById('edit-container');
  const inputs = container.querySelectorAll('.group-name-input');
  
  const renamedGroups = {};
  inputs.forEach(input => {
    const originalName = input.dataset.originalName;
    const newName = input.value.trim() || originalName;
    renamedGroups[newName] = currentGroups[originalName];
  });
  
  let groupedCount = 0;
  for (const [name, tabs] of Object.entries(renamedGroups)) {
    if (tabs && tabs.length > 0) {
      const ids = tabs.map(t => t.id);
      const groupId = await chrome.tabs.group({ tabIds: ids });
      await chrome.tabGroups.update(groupId, { title: name });
      groupedCount += ids.length;
    }
  }
  
  setStatus(`Organized ${groupedCount} tabs into ${Object.keys(renamedGroups).length} groups`, 'success');
  document.getElementById('edit-container').style.display = 'none';
  document.getElementById('doneBtn').style.display = 'none';
  document.getElementById('groupBtn').style.display = 'block';
  document.getElementById('duplicateBtn').style.display = 'block';
  document.getElementById('options-container').style.display = 'block';
}

function normalizeUrl(url) {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

function findDuplicateTabs(tabs) {
  const seenUrls = new Set();
  const duplicates = [];
  
  // chrome.tabs.query returns tabs sorted by index (left-to-right)
  tabs.forEach(tab => {
    const url = normalizeUrl(tab.url);
    if (seenUrls.has(url)) {
      // This is a subsequent occurrence, so it's a duplicate
      duplicates.push(tab);
    } else {
      // This is the first time we see this URL, keep it as the unique "original"
      seenUrls.add(url);
    }
  });

  return duplicates;
}

document.getElementById('groupBtn').addEventListener('click', async () => {
  setStatus('Loading AI model...', 'loading');
  document.getElementById('options-container').style.display = 'none';
  
  try {
    const labels = await getLabels();
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const clf = await loadTransformers();
    
    setStatus('Classifying tabs...', 'loading');
    
    const groups = {};
    for (const tab of tabs) {
      if (tab.url.startsWith('chrome://')) continue;
      
      const text = `${tab.title} ${tab.url}`;
      const result = await clf(text, labels);
      const category = result.labels[0];
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ id: tab.id, title: tab.title, url: tab.url });
    }
    
    currentGroups = groups;
    setStatus('Review and edit groups below:', 'success');
    renderEditView(groups);
  } catch (error) {
    setStatus('Error: ' + error.message, 'error');
    document.getElementById('options-container').style.display = 'block';
  }
});

document.getElementById('duplicateBtn').addEventListener('click', async () => {
  setStatus('Scanning for duplicates...', 'loading');
  
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const duplicates = findDuplicateTabs(tabs);
    
    if (duplicates.length === 0) {
      setStatus('No duplicate tabs found.', 'success');
      return;
    }
    
    const groups = {
      'Duplicates': duplicates
    };
    
    currentGroups = groups;
    setStatus(`Found ${duplicates.length} duplicate tabs.`, 'success');
    renderEditView(groups);
  } catch (error) {
    setStatus('Error: ' + error.message, 'error');
  }
});

document.getElementById('doneBtn').addEventListener('click', applyGroups);


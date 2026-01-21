const DEFAULT_LABELS = ['Work', 'Social', 'Entertainment', 'Shopping', 'News', 'Finance', 'Development'];

let worker = null;
let currentGroups = {};

function getWorker() {
  if (!worker) {
    worker = new Worker('worker.js', { type: 'module' });
  }
  return worker;
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
}

document.getElementById('groupBtn').addEventListener('click', async () => {
  setStatus('Fetching tabs...', 'loading');
  
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabData = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));
  
  const w = getWorker();
  
  w.onmessage = (e) => {
    const { type, message, groups } = e.data;
    
    if (type === 'progress') {
      setStatus(message, 'loading');
    } else if (type === 'complete') {
      currentGroups = groups;
      setStatus('Review and edit groups below:', 'success');
      renderEditView(groups);
    } else if (type === 'error') {
      setStatus('Error: ' + message, 'error');
    }
  };
  
  w.postMessage({ tabs: tabData, labels: DEFAULT_LABELS });
});

document.getElementById('doneBtn').addEventListener('click', applyGroups);


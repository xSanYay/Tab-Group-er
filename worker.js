importScripts('transformers.min.js');

const { pipeline, env } = transformers;
env.allowLocalModels = false;

let classifier = null;

async function loadClassifier(sendProgress) {
  if (classifier) return classifier;
  
  sendProgress('Loading AI model...');
  classifier = await pipeline(
    'zero-shot-classification',
    'Xenova/mobilebert-uncased-mnli',
    {
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          sendProgress(`Downloading model: ${pct}%`);
        }
      }
    }
  );
  return classifier;
}

self.onmessage = async (e) => {
  const { tabs, labels } = e.data;
  
  const sendProgress = (msg) => {
    self.postMessage({ type: 'progress', message: msg });
  };

  try {
    const model = await loadClassifier(sendProgress);
    sendProgress('Classifying tabs...');
    
    const groups = {};
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const text = tab.title || tab.url || 'Untitled';
      
      const result = await model(text, labels, { multi_label: false });
      const topLabel = result.labels[0];
      
      if (!groups[topLabel]) {
        groups[topLabel] = [];
      }
      groups[topLabel].push({ id: tab.id, title: tab.title });
      
      sendProgress(`Classified ${i + 1}/${tabs.length} tabs`);
    }
    
    self.postMessage({ type: 'complete', groups });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};

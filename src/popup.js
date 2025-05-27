import { verifyWebGPU } from './captioner.js';

const browser = window.browser || window.chrome

const supportedElem = document.querySelector('.isSupported')
const selectionPicker = document.querySelector("#model-picker")
const statusLLM = document.querySelector('.status')
const customPromptTextarea = document.querySelector('#customPrompt')
const progressContainer = document.querySelector('#progress-container')
const loadingMessage = document.querySelector('#loading-message')
const progressItems = document.querySelector('#progress-items')

// Progress tracking
let currentProgressItems = [];

// Format bytes utility (from Progress.jsx)
function formatBytes(size) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    +(size / Math.pow(1024, i)).toFixed(2) * 1 +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

// Create progress bar element
function createProgressBar(file, percentage = 0, total) {
  const progressDiv = document.createElement('div');
  progressDiv.className = 'progress-bar';
  progressDiv.dataset.file = file;
  progressDiv.style.cssText = `
    width: 100%;
    background-color: #f3f4f6;
    border-radius: 0.5rem;
    overflow: hidden;
    margin-bottom: 0.125rem;
  `;
  
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.cssText = `
    background-color: #60a5fa;
    white-space: nowrap;
    padding: 0 0.25rem;
    font-size: 0.875rem;
    width: ${percentage}%;
    transition: width 0.3s ease;
  `;
  
  const text = `${file} (${percentage.toFixed(2)}%${isNaN(total) ? '' : ` of ${formatBytes(total)}`})`;
  progressFill.textContent = text;
  
  progressDiv.appendChild(progressFill);
  return progressDiv;
}

// Update progress bar
function updateProgressBar(file, percentage, total) {
  const progressBar = progressItems.querySelector(`[data-file="${file}"]`);
  if (progressBar) {
    const progressFill = progressBar.querySelector('.progress-fill');
    progressFill.style.width = `${percentage}%`;
    const text = `${file} (${percentage.toFixed(2)}%${isNaN(total) ? '' : ` of ${formatBytes(total)}`})`;
    progressFill.textContent = text;
  }
}

// Remove progress bar
function removeProgressBar(file) {
  const progressBar = progressItems.querySelector(`[data-file="${file}"]`);
  if (progressBar) {
    progressBar.remove();
  }
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Popup received message:', message);
  
  switch (message.type) {
    case 'loading':
      statusLLM.innerText = message.data || 'Loading...';
      loadingMessage.textContent = message.data || '';
      progressContainer.style.display = 'block';
      break;
      
    case 'initiate':
      // Add new progress item
      const progressBar = createProgressBar(message.file, message.progress || 0, message.total);
      progressItems.appendChild(progressBar);
      currentProgressItems.push(message);
      break;
      
    case 'progress':
      // Update existing progress item
      updateProgressBar(message.file, message.progress, message.total);
      // Update stored progress items
      currentProgressItems = currentProgressItems.map(item => {
        if (item.file === message.file) {
          return { ...item, ...message };
        }
        return item;
      });
      break;
      
    case 'done':
      // Remove completed progress item
      removeProgressBar(message.file);
      currentProgressItems = currentProgressItems.filter(item => item.file !== message.file);
      break;
      
    case 'ready':
      statusLLM.innerText = 'Model Ready';
      progressContainer.style.display = 'none';
      // Clear progress items
      progressItems.innerHTML = '';
      currentProgressItems = [];
      break;
      
    case 'error':
      statusLLM.innerText = 'Error: ' + message.data;
      progressContainer.style.display = 'none';
      break;
  }
});

// Initialize WebGPU check
if(await verifyWebGPU()){
    supportedElem.innerText = "WebGPU is supported"
} else {
    supportedElem.innerText = "WebGPU is not supported"
}

selectionPicker.addEventListener('change', function (e) {
  console.log("Changed Model!")
  console.log(e)
  document.querySelector("#selected-model").innerText = "Selected Model: " + e.target.value
  browser.storage.local.set({"vlmModel": e.target.value});
})

// Handle custom prompt changes
customPromptTextarea.addEventListener('input', function(e) {
    const customPrompt = e.target.value.trim();
    browser.storage.local.set({"customPrompt": customPrompt});
    console.log("Custom prompt saved:", customPrompt);
});

// Load saved custom prompt on popup open
browser.storage.local.get("customPrompt", function(result) {
    if (result && result.customPrompt) {
        customPromptTextarea.value = result.customPrompt;
    } else {
        // Set a default placeholder
        customPromptTextarea.placeholder = "Enter your custom prompt here (e.g., 'Describe the colors and objects in this image')";
    }
});

// Load saved model selection on popup open
browser.storage.local.get("vlmModel", function(result) {
    if (result && result.vlmModel) {
        selectionPicker.value = result.vlmModel;
        document.querySelector("#selected-model").innerText = "Selected Model: " + result.vlmModel;
    }
});

browser.storage.local.get("status", function(result) {
  console.log("Status result:", result);
  if (result && result.status) {
    statusLLM.innerText = result.status;
  } else {
    statusLLM.innerText = "Status not found";
    console.log("No status found in storage");
  }
});
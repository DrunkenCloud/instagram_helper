document.getElementById('input-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Processing...';

  // Get CSV file
  const csvFile = document.getElementById('csv-input').files[0];
  if (!csvFile) {
    statusDiv.textContent = 'Please select a CSV file.';
    return;
  }

  // Get message template files
  const folderInput = document.getElementById('folder-input');
  const files = Array.from(folderInput.files).filter(f => f.name.endsWith('.txt'));
  if (files.length === 0) {
    statusDiv.textContent = 'No .txt files found in selected folder.';
    return;
  }

  // Read CSV
  const csvText = await csvFile.text();
  // Simple CSV parse (assume first row is header, comma separated)
  const [headerLine, ...rows] = csvText.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  const contacts = rows.map(row => {
    const values = row.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });

  // Read all txt files
  const messages = {};
  for (const file of files) {
    messages[file.name] = await file.text();
  }

  // Read timing configuration
  const sleepMin = parseFloat(document.getElementById('sleep-min').value) || 0.5;
  const sleepMax = parseFloat(document.getElementById('sleep-max').value) || 2;
  const batchCount = parseInt(document.getElementById('batch-count').value) || 10;
  const batchSleepMin = parseFloat(document.getElementById('batch-sleep-min').value) || 10;
  const batchSleepMax = parseFloat(document.getElementById('batch-sleep-max').value) || 30;

  statusDiv.textContent = `Loaded ${contacts.length} contacts and ${files.length} message templates.`;

  // Send all data to main process
  const config = { sleepMin, sleepMax, batchCount, batchSleepMin, batchSleepMax };
  setButtonStates('sending'); // Always enable buttons immediately
  let result;
  try {
    if (window.electronAPI && window.electronAPI.startSending) {
      result = await window.electronAPI.startSending({ contacts, messages, config });
    } else if (window.ipcRenderer) {
      result = await window.ipcRenderer.invoke('start-sending', { contacts, messages, config });
    } else {
      statusDiv.textContent = 'IPC not available.';
      setButtonStates('idle');
      return;
    }
    statusDiv.textContent = result.ok ? 'Started sending messages!' : 'Failed to start.';
  } catch (err) {
    statusDiv.textContent = 'Error: ' + (err.message || err);
  } finally {
    setButtonStates('idle'); // Always reset buttons when done
  }
});

// CSV preview
const csvInput = document.getElementById('csv-input');
const csvPreview = document.getElementById('csv-preview');
csvInput.addEventListener('change', async () => {
  const file = csvInput.files[0];
  if (!file) { csvPreview.textContent = ''; return; }
  const text = await file.text();
  const lines = text.split(/\r?\n/).slice(0, 10);
  csvPreview.textContent = lines.join('\n');
});

// Templates preview
const folderInput = document.getElementById('folder-input');
const templatesPreview = document.getElementById('templates-preview');
folderInput.addEventListener('change', async () => {
  const files = Array.from(folderInput.files).filter(f => f.name.endsWith('.txt')).slice(0, 10);
  if (files.length === 0) { templatesPreview.textContent = ''; return; }
  let out = '';
  for (const file of files) {
    const content = await file.text();
    out += `<b>${file.name}</b>\n` + content.split(/\r?\n/).slice(0, 5).join('\n') + '\n\n';
  }
  templatesPreview.innerHTML = out.replace(/\n/g, '<br>');
});

// Pause/Resume/Stop button logic
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const stopBtn = document.getElementById('stop-btn');

let sending = false;

function setButtonStates(state) {
  if (state === 'idle') {
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    stopBtn.disabled = true;
  } else if (state === 'sending') {
    pauseBtn.disabled = false;
    resumeBtn.disabled = true;
    stopBtn.disabled = false;
  } else if (state === 'paused') {
    pauseBtn.disabled = true;
    resumeBtn.disabled = false;
    stopBtn.disabled = false;
  }
}
setButtonStates('idle');

pauseBtn.onclick = () => {
  if (window.electronAPI && window.electronAPI.pauseSending) window.electronAPI.pauseSending();
  setButtonStates('paused');
};
resumeBtn.onclick = () => {
  if (window.electronAPI && window.electronAPI.resumeSending) window.electronAPI.resumeSending();
  setButtonStates('sending');
};
stopBtn.onclick = () => {
  if (window.electronAPI && window.electronAPI.stopSending) window.electronAPI.stopSending();
  setButtonStates('idle');
}; 
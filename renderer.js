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

  statusDiv.textContent = `Loaded ${contacts.length} contacts and ${files.length} message templates.`;

  // TODO: Send contacts and messages to main process to start sending
  if (window.electronAPI && window.electronAPI.startSending) {
    const result = await window.electronAPI.startSending({ contacts, messages });
    statusDiv.textContent = result.ok ? 'Started sending messages!' : 'Failed to start.';
  } else if (window.ipcRenderer) {
    // Fallback for contextBridge not set up
    const result = await window.ipcRenderer.invoke('start-sending', { contacts, messages });
    statusDiv.textContent = result.ok ? 'Started sending messages!' : 'Failed to start.';
  } else {
    statusDiv.textContent = 'IPC not available.';
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
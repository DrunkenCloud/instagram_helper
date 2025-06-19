const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')
const { sendMessages } = require('./script.js')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Global control object for pause/resume/stop
const sendingControl = { paused: false, stopped: false };

ipcMain.handle('start-sending', async (event, { contacts, messages, config }) => {
  sendingControl.paused = false;
  sendingControl.stopped = false;
  const templates = Object.values(messages);
  try {
    await sendMessages(contacts, templates, config, sendingControl); // pass control object
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err.message };
  }
});

ipcMain.on('pause-sending', () => { sendingControl.paused = true; });
ipcMain.on('resume-sending', () => { sendingControl.paused = false; });
ipcMain.on('stop-sending', () => { sendingControl.stopped = true; });

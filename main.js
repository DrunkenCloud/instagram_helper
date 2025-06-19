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

ipcMain.handle('start-sending', async (event, { contacts, messages }) => {
  // messages is an object: { filename: content }
  const templates = Object.values(messages);
  try {
    await sendMessages(contacts, templates); // pass full contacts, not just usernames
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err.message };
  }
})

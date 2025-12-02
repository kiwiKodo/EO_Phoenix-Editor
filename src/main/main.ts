import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

// Optional secure storage via keytar. Attempt to require at runtime; if not present we'll return errors from handlers.
let keytar: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  keytar = require('keytar')
} catch (e) {
  keytar = null
}
const KEYTAR_SERVICE = 'eo-phoenix-editor'
const KEYTAR_ACCOUNT = 'wifi'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  // Start maximized for a large editing surface (preferred over fullscreen)
  try { win.maximize() } catch (e) { /* ignore */ }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  // Open DevTools automatically in dev mode to assist debugging/layout inspection.
  try { win.webContents.openDevTools({ mode: 'right' }) } catch (e) { /* ignore */ }
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: export a package (copy files into chosen folder)
ipcMain.handle('editor:export', async (event, payload) => {
  // payload: { files: string[], metadata: object }
  const folder = dialog.showOpenDialogSync({ properties: ['openDirectory', 'createDirectory'] })
  if (!folder || folder.length === 0) return { ok: false, error: 'no-folder' }
  const dest = folder[0]
  try {
  // create metadata or settings file
  const filename = payload && payload.filename ? payload.filename : 'metadata.json'
  fs.writeFileSync(path.join(dest, filename), JSON.stringify(payload.metadata || {}, null, 2))
    // copy files
    for (const f of payload.files || []) {
      const base = path.basename(f)
      try {
        fs.copyFileSync(f, path.join(dest, base))
      } catch (err) {
        // ignore individual copy errors
        console.warn('copy error', f, err)
      }
    }
    return { ok: true, dest }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// simple file list handler - accepts optional opts.defaultPath to open dialog in a suggested folder
ipcMain.handle('editor:selectFiles', async (event, opts?: any) => {
  const defaultPath = opts && opts.defaultPath ? opts.defaultPath : undefined
  const res = dialog.showOpenDialogSync({ properties: ['openFile', 'multiSelections'], defaultPath })
  return res || []
})

// select a folder (used by the slideshow folder picker)
ipcMain.handle('editor:selectFolder', async (event, opts?: any) => {
  const defaultPath = opts && opts.defaultPath ? opts.defaultPath : undefined
  const res = dialog.showOpenDialogSync({ properties: ['openDirectory', 'createDirectory'], defaultPath })
  if (!res || res.length === 0) return { ok: false, error: 'no-folder-selected' }
  return { ok: true, path: res[0] }
})

// import a settings.json (open and return parsed content)
ipcMain.handle('editor:loadSettings', async () => {
  // Accept optional opts: { defaultPath }
  // Note: event param omitted previously; include opts via arguments
  // @ts-ignore
  const opts = arguments[1]
  const defaultPath = opts && opts.defaultPath ? opts.defaultPath : undefined
  const res = dialog.showOpenDialogSync({ properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath })
  if (!res || res.length === 0) return { ok: false, error: 'no-file-selected' }
  const fp = res[0]
  try {
    const contents = fs.readFileSync(fp, 'utf8')
    const parsed = JSON.parse(contents)
    return { ok: true, parsed, path: fp }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// save settings.json to chosen location
ipcMain.handle('editor:saveSettings', async (event, settings) => {
  try {
    // opts passed as third argument (opts may contain suggestedPath)
    // @ts-ignore
    const opts = arguments[2]
    const suggestedPath = opts && opts.suggestedPath ? opts.suggestedPath : undefined
    let defaultPath = 'settings.json'
    if (suggestedPath) {
      try { defaultPath = path.join(suggestedPath, defaultPath) } catch (e) { /* ignore */ }
    }
    const res = dialog.showSaveDialogSync({ 
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath
    })
    if (!res) return { ok: false, error: 'no-file-selected' }
    fs.writeFileSync(res, JSON.stringify(settings, null, 2))
    return { ok: true, path: res }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// Read a file and return a data URL (base64). Used by renderer to safely load local images
ipcMain.handle('editor:readFileDataUrl', async (event, filePath: string) => {
  try {
    if (!filePath) return { ok: false, error: 'no-path' }
    const buf = fs.readFileSync(filePath)
    // infer mime from extension
    const ext = path.extname(filePath).toLowerCase()
    let mime = 'application/octet-stream'
    if (ext === '.png') mime = 'image/png'
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg'
    else if (ext === '.gif') mime = 'image/gif'
    else if (ext === '.webp') mime = 'image/webp'
    else if (ext === '.svg') mime = 'image/svg+xml'
    const data = `data:${mime};base64,${buf.toString('base64')}`
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// Keytar-backed WiFi credential storage (secure, OS-managed)
ipcMain.handle('editor:setWifiCreds', async (event, creds: { ssid?: string; password?: string }) => {
  try {
    if (!keytar) return { ok: false, error: 'keytar-not-available' }
    await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT, JSON.stringify(creds || {}))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('editor:getWifiCreds', async () => {
  try {
    if (!keytar) return { ok: false, error: 'keytar-not-available' }
    const stored = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
    if (!stored) return { ok: true, creds: null }
    try { return { ok: true, creds: JSON.parse(stored) } } catch (e) { return { ok: true, creds: null } }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('editor:clearWifiCreds', async () => {
  try {
    if (!keytar) return { ok: false, error: 'keytar-not-available' }
    const removed = await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT)
    return { ok: true, removed }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// Save a single image either from a local path or a data URL. Payload = { type: 'path'|'dataUrl', path?, dataUrl?, defaultName? }
ipcMain.handle('editor:saveImageAs', async (event, payload: any) => {
  try {
    if (!payload) return { ok: false, error: 'no-payload' }
    // Prompt save dialog to choose destination file (including filename)
    const defaultName = payload.defaultName || 'image.png'
    // If the caller provided a suggestedPath (a folder), use it to create a defaultPath
    let defaultPath = defaultName
    if (payload.suggestedPath) {
      try {
        // join safely using path
        defaultPath = path.join(payload.suggestedPath, defaultName)
      } catch (e) {
        defaultPath = defaultName
      }
    }
    const res = dialog.showSaveDialogSync({ defaultPath, filters: [{ name: 'Images', extensions: ['png','jpg','jpeg','webp','gif'] }] })
    if (!res) return { ok: false, error: 'no-file-selected' }

    if (payload.type === 'path' && payload.path) {
      // copy source file to chosen destination
      fs.copyFileSync(payload.path, res)
      return { ok: true, dest: res }
    }

    if (payload.type === 'dataUrl' && payload.dataUrl) {
      // data URL format: data:<mime>;base64,<data>
      const m = /^data:(.+);base64,(.+)$/.exec(payload.dataUrl)
      if (!m) return { ok: false, error: 'invalid-data-url' }
      const b = Buffer.from(m[2], 'base64')
      fs.writeFileSync(res, b)
      return { ok: true, dest: res }
    }

    return { ok: false, error: 'unsupported-payload' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

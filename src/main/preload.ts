import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('eo', {
  export: (payload: any) => ipcRenderer.invoke('editor:export', payload),
  selectFiles: (opts?: any) => ipcRenderer.invoke('editor:selectFiles', opts),
  selectFolder: (opts?: any) => ipcRenderer.invoke('editor:selectFolder', opts),
  loadSettings: (opts?: any) => ipcRenderer.invoke('editor:loadSettings', opts),
  saveSettings: (settings: any, opts?: any) => ipcRenderer.invoke('editor:saveSettings', settings, opts),
  // WiFi credential helpers (secure storage via main/keytar)
  setWifiCreds: (creds: { ssid?: string; password?: string }) => ipcRenderer.invoke('editor:setWifiCreds', creds),
  getWifiCreds: () => ipcRenderer.invoke('editor:getWifiCreds'),
  clearWifiCreds: () => ipcRenderer.invoke('editor:clearWifiCreds'),
  readFileDataUrl: (filePath: string) => ipcRenderer.invoke('editor:readFileDataUrl', filePath)
  , saveImageAs: (payload: any) => ipcRenderer.invoke('editor:saveImageAs', payload)
})

import type { ContextBridge, IpcRenderer } from 'electron';

/**
 * Registers the Electron API bridge in the preload script
 * This exposes a safe API to the renderer process for IPC communication
 * @param contextBridge - The Electron contextBridge instance
 * @param ipcRenderer - The Electron ipcRenderer instance
 */
export const registerElectronApiBridge = (
  contextBridge: ContextBridge,
  ipcRenderer: IpcRenderer,
) => {
  contextBridge.exposeInMainWorld('electronApi', {
    invoke: (channel: any, ...props: any[]) =>
      ipcRenderer.invoke(channel, ...props),
    on: (channel: any, callback: (...props: any[]) => void) =>
      ipcRenderer.on(channel, callback),
    removeListener: (channel: any, callback: (...props: any[]) => void) =>
      ipcRenderer.removeListener(channel, callback),
    // send: (channel, ...props) => ipcRenderer.send(channel, ...props),
    // removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  });
};

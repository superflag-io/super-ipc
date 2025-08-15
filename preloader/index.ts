import type { ContextBridge, IpcRenderer } from 'electron';
import { app } from 'electron';

export const PRELOADER_CONSTANT_SUPER_IPC = 'TEST';

/**
 * Registers the Electron API bridge in the preload script
 * This exposes a safe API to the renderer process for IPC communication
 * @param contextBridge - The Electron contextBridge instance
 * @param ipcRenderer - The Electron ipcRenderer instance
 * @param appVersion - Optional app version override (defaults to app.getVersion())
 */
export const registerElectronApiBridge = (
  contextBridge: ContextBridge,
  ipcRenderer: IpcRenderer,
  appVersion?: string,
) => {
  contextBridge.exposeInMainWorld('electronApi', {
    invoke: (channel: any, ...props: any[]) =>
      ipcRenderer.invoke(channel, ...props),
    on: (channel: any, callback: (...props: any[]) => void) =>
      ipcRenderer.on(channel, callback),
    removeListener: (channel: any, callback: (...props: any[]) => void) =>
      ipcRenderer.removeListener(channel, callback),
    // App version from app.getVersion() or fallback to global app
    version: appVersion || app.getVersion(),
    // send: (channel, ...props) => ipcRenderer.send(channel, ...props),
    // removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  });
};

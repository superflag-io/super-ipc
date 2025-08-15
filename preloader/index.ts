import type { ContextBridge, IpcRenderer } from 'electron';
import { app } from 'electron';

export const PRELOADER_CONSTANT_SUPER_IPC = 'TEST';

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

import type { ContextBridge, IpcRenderer } from 'electron';

export const PRELOADER_CONSTANT_SUPER_IPC = 'TEST';

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

import type { ContextBridge, IpcRenderer } from 'electron';

/**
 * Registers the Electron API bridge in the preload script.
 *
 * Listeners use an ID-based registry so that `off(id)` can reliably
 * remove them. Passing the original callback to `ipcRenderer.removeListener`
 * does not work under context isolation because `contextBridge` wraps
 * every function argument in a new proxy on each call.
 *
 * @param contextBridge - The Electron contextBridge instance
 * @param ipcRenderer - The Electron ipcRenderer instance
 */
export const registerElectronApiBridge = (
  contextBridge: ContextBridge,
  ipcRenderer: IpcRenderer,
) => {
  const listenerRegistry = new Map<
    number,
    { channel: string; handler: (...args: any[]) => void }
  >();
  let nextId = 1;

  contextBridge.exposeInMainWorld('electronApi', {
    invoke: (channel: any, ...props: any[]) =>
      ipcRenderer.invoke(channel, ...props),
    on: (channel: any, callback: (...props: any[]) => void): number => {
      const id = nextId++;
      const handler = (...args: any[]) => callback(...args);
      listenerRegistry.set(id, { channel, handler });
      ipcRenderer.on(channel, handler);
      return id;
    },

    removeListener: (id: number) => {
      const entry = listenerRegistry.get(id);
      if (entry) {
        ipcRenderer.removeListener(entry.channel, entry.handler);
        listenerRegistry.delete(id);
      }
    },
  });
};

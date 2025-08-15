import type { App, IpcMain } from 'electron';
import { wrapHandler, wrapHandlerAsync } from './wrapHandler';
import type { BackendHandler, BackendHandlerAsync } from './types';

/**
 * Sets up IPC handlers for both synchronous and asynchronous backend calls
 * @param app - The Electron App instance
 * @param backendHandlers - Map of channel names to synchronous handler functions
 * @param backendAsyncHandlers - Map of channel names to asynchronous handler functions
 * @param ipcMain - The Electron IpcMain instance
 * @throws {Error} When app or ipcMain instances are missing
 * @throws {Error} When channel names are invalid or handlers are not functions
 * @throws {Error} When attempting to register duplicate channels
 */
export function setupApiHandlers(
  app: App,
  backendHandlers: Record<string, BackendHandler>,
  backendAsyncHandlers: Record<string, BackendHandlerAsync>,
  ipcMain: IpcMain,
) {
  if (!app) {
    throw new Error('App instance is required');
  }
  if (!ipcMain) {
    throw new Error('IpcMain instance is required');
  }

  const registeredChannels = new Set<string>();

  // Setup sync handlers
  Object.entries(backendHandlers || {}).forEach(([channel, handler]) => {
    if (!channel || typeof channel !== 'string') {
      throw new Error(`Invalid channel name: ${channel}`);
    }
    if (!handler || typeof handler !== 'function') {
      throw new Error(`Handler for channel '${channel}' must be a function`);
    }
    if (registeredChannels.has(channel)) {
      throw new Error(`Channel '${channel}' is already registered`);
    }

    ipcMain.handle(channel, wrapHandler(app, handler));
    registeredChannels.add(channel);
  });

  // Setup async handlers
  Object.entries(backendAsyncHandlers || {}).forEach(([channel, handler]) => {
    if (!channel || typeof channel !== 'string') {
      throw new Error(`Invalid async channel name: ${channel}`);
    }
    if (!handler || typeof handler !== 'function') {
      throw new Error(`Async handler for channel '${channel}' must be a function`);
    }
    if (registeredChannels.has(channel)) {
      throw new Error(`Channel '${channel}' is already registered`);
    }

    ipcMain.handle(channel, wrapHandlerAsync(app, handler, channel));
    registeredChannels.add(channel);
  });
}

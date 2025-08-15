import type { BackendResult } from '@superflag/super-ipc-core';
import {
  AppError,
  ASYNC_REPLY_SUFFIX,
  BackendResultMode,
} from '@superflag/super-ipc-core';
import type { BackendHandler, BackendHandlerAsync } from './types';
import type { App, IpcMainInvokeEvent } from 'electron';

function backendResultFromError(
  error: any,
  resultMode: BackendResultMode = BackendResultMode.Complete,
  callId?: number,
): BackendResult {
  try {
    return {
      error: JSON.stringify(new AppError('error', { inner: error })),
      resultMode,
      callId,
    };
  } catch (serializationError: any) {
    // Fallback if error can't be serialized
    return {
      error: JSON.stringify(
        new AppError('Serialization error occurred', {
          inner: {
            message: `${error?.message || 'Unknown error'}: ${serializationError.message}`,
            name: error?.name || 'Error',
            stack: error?.stack,
          },
        }),
      ),
      resultMode,
      callId,
    };
  }
}

/**
 * Wraps a backend handler function with error handling and result serialization
 * @param app - The Electron App instance
 * @param handler - The backend handler function to wrap
 * @returns A wrapped handler that can be used with ipcMain.handle()
 */
export function wrapHandler(
  app: App,
  handler: BackendHandler,
): (event: IpcMainInvokeEvent, args: any) => Promise<BackendResult> {
  return async (event, args) => {
    try {
      const content = await handler({ app, args, event });
      return {
        content: JSON.stringify(content),
        resultMode: BackendResultMode.Complete, // Fixed: should be Complete for sync operations
      };
    } catch (error) {
      return backendResultFromError(error);
    }
  };
}

function wrapAsyncResult(
  data: any,
  event: IpcMainInvokeEvent,
  channel: string,
  resultMode: BackendResultMode,
  callId: number,
) {
  let result: BackendResult;
  try {
    result = {
      content: JSON.stringify(data),
      resultMode,
      callId,
    };
  } catch (error: any) {
    result = backendResultFromError(
      new Error(`Failed to serialize async result: ${error.message}`),
      resultMode,
      callId,
    );
  }

  // Check if sender is still valid before sending
  try {
    if (!event.sender.isDestroyed()) {
      event.sender.send(channel + ASYNC_REPLY_SUFFIX, result);
    }
  } catch (senderError) {
    // Log error but don't throw - the renderer process may have been destroyed
    console.error(
      `Failed to send async result for channel ${channel}:`,
      senderError,
    );
  }
}

/**
 * Wraps an async backend handler with progress tracking and error handling
 * @param app - The Electron App instance
 * @param handler - The async backend handler function to wrap
 * @param channel - The IPC channel name (used for reply channel construction)
 * @returns A wrapped async handler that supports init/progress/complete callbacks
 */
export function wrapHandlerAsync(
  app: App,
  handler: BackendHandlerAsync,
  channel: string,
): (
  event: IpcMainInvokeEvent,
  args: any,
  callId: number,
) => Promise<BackendResult> {
  return async (event, args, callId) => {
    try {
      const content = await handler({
        app,
        args,
        event,
        handlers: {
          onInit: (data) => {
            wrapAsyncResult(
              data,
              event,
              channel,
              BackendResultMode.Init,
              callId,
            );
          },
          onProgress: (data) => {
            wrapAsyncResult(
              data,
              event,
              channel,
              BackendResultMode.Progress,
              callId,
            );
          },
          onComplete: (data) => {
            wrapAsyncResult(
              data,
              event,
              channel,
              BackendResultMode.Complete,
              callId,
            );
          },
          onError: (error) => {
            try {
              if (!event.sender.isDestroyed()) {
                event.sender.send(
                  channel + ASYNC_REPLY_SUFFIX,
                  backendResultFromError(
                    error,
                    BackendResultMode.Complete,
                    callId,
                  ),
                );
              }
            } catch (senderError) {
              console.error(
                `Failed to send async error for channel ${channel}:`,
                senderError,
              );
            }
          },
        },
      });
      return {
        content: JSON.stringify(content),
        resultMode: BackendResultMode.Complete,
        callId,
      };
    } catch (error) {
      return backendResultFromError(error, BackendResultMode.Complete, callId);
    }
  };
}

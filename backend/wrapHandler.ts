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
) {
  return {
    error: JSON.stringify(new AppError('error', { inner: error })),
    resultMode,
    callId,
  };
}

export function wrapHandler(
  app: App,
  handler: BackendHandler,
): (event: IpcMainInvokeEvent, args: any) => Promise<BackendResult> {
  return async (event, args) => {
    try {
      const content = await handler({ app, args, event });
      return {
        content: JSON.stringify(content),
        resultMode: BackendResultMode.Init,
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
  } catch (error) {
    result = backendResultFromError(error, resultMode, callId);
  }
  event.sender.send(channel + ASYNC_REPLY_SUFFIX, result);
}

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
            event.sender.send(
              channel + ASYNC_REPLY_SUFFIX,
              backendResultFromError(error, BackendResultMode.Complete, callId),
            );
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

import type { App, IpcMainInvokeEvent } from 'electron';
import type {
  BackendAsyncApiType,
  BackendSyncApiType,
} from '@superflag/super-ipc-core';

export type BackendHandler<P = any, R = any> = (args: {
  app: App;
  args: P;
  event: IpcMainInvokeEvent;
}) => Promise<R> | R;

export type BackendHandlerAsync<
  P = any,
  RINIT = any,
  RPROGRESS = any,
  RCOMPLETE = any,
> = (args: {
  app: App;
  args: P;
  event: IpcMainInvokeEvent;
  handlers: {
    onInit: (result: RINIT) => void;
    onProgress: (result: RPROGRESS) => void;
    onComplete: (result: RCOMPLETE) => void;
    onError: (error: any) => void;
  };
}) => Promise<void> | void;

export type BackendSyncHandlersType<
  C extends string,
  T extends BackendSyncApiType<C>,
> = {
  [K in keyof T]: BackendHandler<T[K]['props'], T[K]['result']>;
};

export type BackendAsyncHandlersType<
  C extends string,
  T extends BackendAsyncApiType<C>,
> = {
  [K in keyof T]: BackendHandlerAsync<
    T[K]['props'],
    T[K]['initResult'],
    T[K]['progressResult'],
    T[K]['completeResult']
  >;
};

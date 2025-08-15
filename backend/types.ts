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
  PROPS_TYPE = any,
  RINIT = any,
  RPROGRESS = any,
  RCOMPLETE = any,
> = (args: {
  app: App;
  args: PROPS_TYPE;
  event: IpcMainInvokeEvent;
  handlers: {
    onInit: (result: RINIT) => void;
    onProgress: (result: RPROGRESS) => void;
    onComplete: (result: RCOMPLETE) => void;
    onError: (error: any) => void;
  };
}) => Promise<void> | void;

export type BackendSyncHandlersType<
  CHANNEL_NAMES extends string,
  API_TYPE extends BackendSyncApiType<CHANNEL_NAMES>,
> = {
  [K in keyof API_TYPE]: BackendHandler<API_TYPE[K]['props'], API_TYPE[K]['result']>;
};

export type BackendAsyncHandlersType<
  CHANNEL_NAMES extends string,
  API_TYPE extends BackendAsyncApiType<CHANNEL_NAMES>,
> = {
  [K in keyof API_TYPE]: BackendHandlerAsync<
    API_TYPE[K]['props'],
    API_TYPE[K]['initResult'],
    API_TYPE[K]['progressResult'],
    API_TYPE[K]['completeResult']
  >;
};

# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc
architecture that doesn't require using a local web server;

## Usage

### Common

```ts
// api.ts
export enum PROMISE_CHANNEL {
  LoadConfiguration = 'LOAD_CONFIGURATION',
  SaveConfiguration = 'SAVE_CONFIGURATION',
  // ...
}

export enum ASYNC_CHANNEL {
  RunBatchOperation = 'RUN_BATCH_OPERATION',
  // ...
}

export interface BackendPromiseApi extends BackendSyncApiType<PROMISE_CHANNEL> {
  [PROMISE_CHANNEL.LoadConfiguration]: {
    props: void;
    result: GlobalAppConfig;
  };
  [PROMISE_CHANNEL.SaveConfiguration]: {
    props: GlobalAppConfig;
    result: void;
  };
}

export interface BackendAsyncApi extends BackendAsyncApiType<ASYNC_CHANNEL> {
  [ASYNC_CHANNEL.RunBatchOperation]: {
    props: RunBatchOperationProps;
    initResult: RunBatchOperationInitResult;
    progressResult: RunBatchOperationProgressResult;
    completeResult: RunBatchOperationCompleteResult;
  };
}
```

### Backend

```ts
// handlers.ts
export const BackendHandlers: BackendSyncHandlersType<PROMISE_CHANNEL, BackendPromiseApi> = {
  [PROMISE_CHANNEL.LoadConfiguration]: ({ app }) => {
    /// sync code here, returns the result
  },
  [PROMISE_CHANNEL.SaveConfiguration]: ({ app, args: config }) => {
    // sync code here
  },
};

export const BackendAsyncHandlers: BackendAsyncHandlersType<ASYNC_CHANNEL, BackendAsyncApi> = {
  [ASYNC_CHANNEL.RunBatchOperation]: ({
    app,
    args: { config, operationMode },
    handlers: { onInit, onProgress, onComplete, onError },
  }) => {
    /// async code here
  },
};

// main.ts

setupApiHandlers(app, BackendHandlers, BackendAsyncHandlers, ipcMain);
```

### Frontend

Preload file:

```ts
// preload.ts
import { registerElectronApiBridge } from '@superflag/super-ipc/preloader';
import { contextBridge, ipcRenderer } from 'electron';

registerElectronApiBridge(contextBridge, ipcRenderer);
```

React usage:

```tsx
// hooks.ts
import {
  createUseBackendAsyncHook,
  createUseBackendSyncHook,
} from '@superflag/super-ipc/react';

export const useBackend = createUseBackendSyncHook<
  PROMISE_CHANNEL,
  BackendPromiseApi
>();

export const useBackendAsync = createUseBackendAsyncHook<
  ASYNC_CHANNEL,
  BackendAsyncApi
>();

// hook usage
const { data, error, loading } = useBackend({
  channel: PROMISE_CHANNEL.LoadConfiguration,
  props: {
    // ...
  }
});
```

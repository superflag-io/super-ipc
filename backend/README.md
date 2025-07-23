# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc
architecture that doesn't require using a local web server;

## Usage

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

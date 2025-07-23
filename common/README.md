# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc
architecture that doesn't require using a local web server;

## Usage

### Core

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

# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc
architecture that doesn't require using a local web server;

## Usage

### Frontend

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

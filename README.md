# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc 
architecture that doesn't require using a local web server;

## Usage
Preload file:
```ts
// preload.ts
import { registerElectronApiBridge } from '@superflag-io/super-ipc/preloader';
import { contextBridge, ipcRenderer } from 'electron';

registerElectronApiBridge(contextBridge, ipcRenderer);
```

React usage:
```tsx

```

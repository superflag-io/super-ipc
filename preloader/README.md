# super-ipc

A sensibly typed set of wrappers around electron's confusing ipc
architecture that doesn't require using a local web server;

## Usage

### Frontend

Preload file:

```ts
// preload.ts
import { registerElectronApiBridge } from '@superflag/super-ipc/preloader';
import { contextBridge, ipcRenderer } from 'electron';

registerElectronApiBridge(contextBridge, ipcRenderer);
```

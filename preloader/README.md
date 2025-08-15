# @superflag/super-ipc-preloader

[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-preloader.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-preloader)
[![npm downloads](https://img.shields.io/npm/dm/@superflag/super-ipc-preloader.svg)](https://www.npmjs.com/package/@superflag/super-ipc-preloader)

Preload script utilities for Super IPC. This package provides the bridge that safely exposes IPC functionality to your Electron renderer process while maintaining security through context isolation.

## Installation

```bash
npm install @superflag/super-ipc-preloader
```

## What This Package Provides

- **Context Bridge Setup**: Secure IPC bridge registration with Electron's context isolation
- **Type-Safe API**: Exposes typed IPC methods to the renderer process
- **Security**: Maintains Electron's security model while enabling IPC communication
- **Zero Configuration**: Works out of the box with a single function call

## Quick Start

### Basic Setup

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// This is all you need! The bridge will be available as window.electronApi
registerElectronApiBridge(contextBridge, ipcRenderer);
```

### Webpack Configuration

If you're using Webpack to bundle your preload script:

```js
// webpack.preload.js
module.exports = {
  entry: './src/preload/preload.ts',
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'preload.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
```

## API Reference

### `registerElectronApiBridge(contextBridge, ipcRenderer, appVersion?)`

Registers the IPC bridge that exposes Super IPC functionality to the renderer process.

**Parameters:**
- `contextBridge`: Electron's contextBridge module
- `ipcRenderer`: Electron's ipcRenderer module

**Returns:** `void`

**Example:**
```ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// Basic usage
registerElectronApiBridge(contextBridge, ipcRenderer);
```

## What Gets Exposed

After calling `registerElectronApiBridge`, the renderer process will have access to:

```ts
// Available in renderer process as window.electronApi
interface ElectronApi {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
}
```

## Usage Examples

### Basic Preload Script

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// Enable the IPC bridge
registerElectronApiBridge(contextBridge, ipcRenderer);

// Optional: Add additional custom APIs
contextBridge.exposeInMainWorld('customAPI', {
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
});
```

### Basic Usage

The bridge is always registered under the `electronApi` namespace:

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// Register the IPC bridge (always uses 'electronApi' namespace)
registerElectronApiBridge(contextBridge, ipcRenderer);
```

### Advanced Configuration

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// Register the Super IPC bridge
registerElectronApiBridge(contextBridge, ipcRenderer);

// Add logging for development
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    log: (message: string) => console.log(`[Preload]: ${message}`),
    ipcStats: () => {
      // Custom IPC statistics or debugging info
      return {
        activeOperations: getActiveOperationCount(),
        totalRequests: getTotalRequestCount(),
      };
    },
  });
}

// Add app-specific utilities
contextBridge.exposeInMainWorld('appUtils', {
  // Environment info
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // System info
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
  
  // Custom utilities
  formatFileSize: (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
});
```

## Security Considerations

### What This Package Does for Security

1. **Context Isolation**: Uses Electron's `contextBridge` to safely expose APIs
2. **No Direct Access**: Renderer never gets direct access to Node.js or Electron APIs
3. **Controlled Interface**: Only exposes the specific IPC methods needed
4. **Type Safety**: Prevents arbitrary IPC calls through TypeScript

### Best Practices

#### DO ✅

```ts
// Good: Use the provided bridge
registerElectronApiBridge(contextBridge, ipcRenderer);

// Good: Add minimal, specific utilities
contextBridge.exposeInMainWorld('appInfo', {
  version: app.getVersion(), // Static, safe data
  platform: process.platform, // Static, safe data
});
```

#### DON'T ❌

```ts
// Bad: Don't expose entire modules
contextBridge.exposeInMainWorld('fs', require('fs'));

// Bad: Don't expose dangerous functions
contextBridge.exposeInMainWorld('dangerousAPI', {
  executeCommand: (cmd) => require('child_process').exec(cmd),
  readAnyFile: (path) => require('fs').readFileSync(path),
});

// Bad: Don't disable security features
// webPreferences: {
//   nodeIntegration: true,        // Don't do this
//   contextIsolation: false,      // Don't do this
// }
```

## Troubleshooting

### Common Issues

#### "electronApi is not defined"

**Problem**: Renderer process can't access `window.electronApi`

**Solutions**:
1. Ensure preload script is correctly specified in `BrowserWindow`:
   ```ts
   new BrowserWindow({
     webPreferences: {
       preload: path.join(__dirname, 'preload.js'), // Correct path
       contextIsolation: true, // Must be true
       nodeIntegration: false, // Must be false
     },
   });
   ```

2. Verify preload script is being executed:
   ```ts
   // Add to preload.ts for debugging
   console.log('Preload script executed');
   ```

#### TypeScript Errors in Renderer

**Problem**: TypeScript doesn't recognize `window.electronApi`

**Solution**: Add type declarations:
```ts
// types/electron.d.ts
export interface IElectronApi {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  version: string;
}

declare global {
  interface Window {
    electronApi: IElectronApi;
  }
}
```

#### Webpack/Build Issues

**Problem**: Preload script not being built correctly

**Solution**: Ensure correct Webpack target:
```js
module.exports = {
  target: 'electron-preload', // Important!
  entry: './src/preload/preload.ts',
  // ... rest of config
};
```

### Debugging Tips

#### Enable IPC Logging

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// Enable debugging in development
if (process.env.NODE_ENV === 'development') {
  // Log all IPC calls
  const originalInvoke = ipcRenderer.invoke;
  ipcRenderer.invoke = (...args) => {
    console.log('IPC Invoke:', args);
    return originalInvoke.apply(ipcRenderer, args);
  };
}

registerElectronApiBridge(contextBridge, ipcRenderer);
```

#### Check Context Isolation

```ts
// In renderer process (for debugging)
console.log('Node integration:', typeof process !== 'undefined');
console.log('Context isolation:', typeof window.electronApi !== 'undefined');
```

## Multiple Preload Scripts

If you need multiple preload scripts for different windows:

```ts
// preload/main-window.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

registerElectronApiBridge(contextBridge, ipcRenderer);

// Main window specific APIs
contextBridge.exposeInMainWorld('mainWindowAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
});
```

```ts
// preload/settings-window.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

registerElectronApiBridge(contextBridge, ipcRenderer);

// Settings window specific APIs
contextBridge.exposeInMainWorld('settingsAPI', {
  resetToDefaults: () => ipcRenderer.invoke('settings:reset'),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
});
```

```ts
// main/main.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload/main-window.js'),
  },
});

const settingsWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload/settings-window.js'),
  },
});
```

## Best Practices

1. **Keep It Simple**: Only expose what you actually need
2. **Use TypeScript**: Get full type safety in your renderer process
3. **Test Thoroughly**: Verify your preload script works in all scenarios
4. **Security First**: Never expose sensitive Node.js APIs directly
5. **Consistent Naming**: Use clear, consistent names for your exposed APIs
6. **Document Well**: Document any custom APIs you expose

The preload script is your security boundary - keep it minimal and focused!

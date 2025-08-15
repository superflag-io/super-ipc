# Super IPC

[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-core.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-core)
[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-backend.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-backend)
[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-preloader.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-preloader)
[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-react.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-react)

A comprehensive, type-safe wrapper around Electron's IPC architecture that eliminates boilerplate and provides clean abstractions for main-renderer communication.

## Why Super IPC?

Electron's IPC system is powerful but verbose and error-prone. Super IPC provides:

- **Type Safety**: Full TypeScript support with end-to-end type checking
- **Clean Architecture**: Separate packages for different parts of your Electron app
- **React Integration**: Built-in React hooks for seamless frontend integration
- **Promise & Async Support**: Handle both simple requests and long-running operations
- **Zero Configuration**: Works out of the box with sensible defaults

## Packages

This monorepo contains four packages designed to work together:

| Package | Description | Install |
|---------|-------------|---------|
| [`@superflag/super-ipc-core`](./common) | Core types and channel definitions | `npm install @superflag/super-ipc-core` |
| [`@superflag/super-ipc-backend`](./backend) | Main process handlers and setup | `npm install @superflag/super-ipc-backend` |
| [`@superflag/super-ipc-preloader`](./preloader) | Preload script utilities | `npm install @superflag/super-ipc-preloader` |
| [`@superflag/super-ipc-react`](./react) | React hooks for renderer process | `npm install @superflag/super-ipc-react` |

## Quick Start

### 1. Define Your API Contract

```ts
// shared/api.ts - shared between main and renderer
import { BackendSyncApiType, BackendAsyncApiType } from '@superflag/super-ipc-core';

export enum CHANNELS {
  GetUserProfile = 'GET_USER_PROFILE',
  SaveSettings = 'SAVE_SETTINGS',
  OpenFile = 'OPEN_FILE',
}

export enum ASYNC_CHANNELS {
  ProcessLargeFile = 'PROCESS_LARGE_FILE',
  DownloadUpdate = 'DOWNLOAD_UPDATE',
}

export interface AppSyncApi extends BackendSyncApiType<CHANNELS> {
  [CHANNELS.GetUserProfile]: {
    props: { userId: string };
    result: { name: string; email: string; avatar?: string };
  };
  [CHANNELS.SaveSettings]: {
    props: { theme: 'light' | 'dark'; notifications: boolean };
    result: void;
  };
  [CHANNELS.OpenFile]: {
    props: void;
    result: { filePath: string; content: string } | null;
  };
}

export interface AppAsyncApi extends BackendAsyncApiType<ASYNC_CHANNELS> {
  [ASYNC_CHANNELS.ProcessLargeFile]: {
    props: { filePath: string; options: ProcessingOptions };
    initResult: { taskId: string; totalSteps: number };
    progressResult: { step: number; message: string };
    completeResult: { outputPath: string; summary: ProcessingSummary };
  };
}
```

### 2. Set Up Main Process Handlers

```ts
// main/handlers.ts
import { BackendSyncHandlersType, BackendAsyncHandlersType } from '@superflag/super-ipc-backend';
import { dialog, app } from 'electron';
import fs from 'fs/promises';

export const syncHandlers: BackendSyncHandlersType<CHANNELS, AppSyncApi> = {
  [CHANNELS.GetUserProfile]: async ({ args }) => {
    // Fetch user profile from database or API
    return {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/path/to/avatar.jpg'
    };
  },

  [CHANNELS.SaveSettings]: async ({ args }) => {
    // Save settings to file or database
    await saveUserSettings(args);
  },

  [CHANNELS.OpenFile]: async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
    });
    
    if (result.canceled) return null;
    
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    return {
      filePath: result.filePaths[0],
      content
    };
  },
};

export const asyncHandlers: BackendAsyncHandlersType<ASYNC_CHANNELS, AppAsyncApi> = {
  [ASYNC_CHANNELS.ProcessLargeFile]: async ({ args, handlers }) => {
    const { onInit, onProgress, onComplete } = handlers;
    
    // Initialize the operation
    const taskId = generateTaskId();
    onInit({ taskId, totalSteps: 100 });
    
    // Simulate long-running operation with progress updates
    for (let step = 1; step <= 100; step++) {
      await processFileChunk(args.filePath, step);
      onProgress({ 
        step, 
        message: `Processing chunk ${step}/100` 
      });
      await delay(50); // Simulate work
    }
    
    // Complete the operation
    onComplete({
      outputPath: '/path/to/processed/file.txt',
      summary: { linesProcessed: 1000, errors: 0 }
    });
  },
};
```

```ts
// main/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { setupApiHandlers } from '@superflag/super-ipc-backend';
import { syncHandlers, asyncHandlers } from './handlers';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set up IPC handlers
  setupApiHandlers(app, syncHandlers, asyncHandlers, ipcMain);

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

### 3. Configure Preload Script

```ts
// preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { registerElectronApiBridge } from '@superflag/super-ipc-preloader';

// This exposes the IPC bridge to the renderer process
registerElectronApiBridge(contextBridge, ipcRenderer);
```

### 4. Use in React Components

```tsx
// renderer/hooks.ts
import {
  createUseBackendSyncHook,
  createUseBackendAsyncHook,
} from '@superflag/super-ipc-react';

export const useBackend = createUseBackendSyncHook<CHANNELS, AppSyncApi>();
export const useBackendAsync = createUseBackendAsyncHook<ASYNC_CHANNELS, AppAsyncApi>();
```

```tsx
// renderer/components/UserProfile.tsx
import React from 'react';
import { useBackend } from '../hooks';
import { CHANNELS } from '../../shared/api';

export function UserProfile({ userId }: { userId: string }) {
  const { data: profile, loading, error } = useBackend({
    channel: CHANNELS.GetUserProfile,
    props: { userId },
  });

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="profile">
      <img src={profile.avatar} alt={profile.name} />
      <h2>{profile.name}</h2>
      <p>{profile.email}</p>
    </div>
  );
}
```

```tsx
// renderer/components/FileProcessor.tsx
import React, { useState } from 'react';
import { useBackendAsync } from '../hooks';
import { ASYNC_CHANNELS } from '../../shared/api';

export function FileProcessor() {
  const [filePath, setFilePath] = useState('');
  
  const {
    initiate,
    data: initData,
    progress,
    result,
    loading,
    error
  } = useBackendAsync({
    channel: ASYNC_CHANNELS.ProcessLargeFile,
  });

  const handleProcess = () => {
    initiate({
      filePath,
      options: { format: 'optimized', compression: true }
    });
  };

  return (
    <div>
      <input 
        value={filePath} 
        onChange={(e) => setFilePath(e.target.value)}
        placeholder="Enter file path"
      />
      <button onClick={handleProcess} disabled={loading}>
        {loading ? 'Processing...' : 'Process File'}
      </button>
      
      {loading && progress && (
        <div>
          <progress value={progress.step} max={initData?.totalSteps} />
          <p>{progress.message}</p>
        </div>
      )}
      
      {result && (
        <div>
          <h3>Processing Complete!</h3>
          <p>Output: {result.outputPath}</p>
          <p>Lines processed: {result.summary.linesProcessed}</p>
        </div>
      )}
      
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

## Common Use Cases

### File Operations
Handle file dialogs, reading/writing files, and file system operations with full type safety.

### Database Operations
Execute database queries from the renderer with progress tracking for large operations.

### System Integration
Access native APIs, shell commands, and system resources safely from your React components.

### Real-time Updates
Stream data from the main process to React components with automatic state management.

### Background Processing
Handle CPU-intensive tasks in the main process while providing real-time progress updates to the UI.

## Architecture Benefits

- **Separation of Concerns**: Each package handles its specific domain
- **Type Safety**: Compile-time checks prevent runtime IPC errors
- **Testability**: Mock IPC calls easily in your tests
- **Scalability**: Add new channels without touching existing code
- **Developer Experience**: IntelliSense support throughout your application

## Documentation

- [Core Types and Channels](./common/README.md)
- [Backend Setup](./backend/README.md)
- [Preloader Configuration](./preloader/README.md)
- [React Integration](./react/README.md)

## License

MIT
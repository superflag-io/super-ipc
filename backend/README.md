# @superflag/super-ipc-backend

[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-backend.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-backend)
[![npm downloads](https://img.shields.io/npm/dm/@superflag/super-ipc-backend.svg)](https://www.npmjs.com/package/@superflag/super-ipc-backend)

Backend handlers and setup utilities for Super IPC. This package provides the tools to implement IPC handlers in Electron's main process with full type safety and automatic request routing.

## Installation

```bash
npm install @superflag/super-ipc-backend
```

## What This Package Provides

- **Handler Setup**: Automatic registration of IPC handlers with Electron's main process
- **Type Safety**: Fully typed handler functions with IntelliSense support
- **Error Handling**: Standardized error propagation to renderer processes
- **Async Support**: Built-in support for long-running operations with progress updates
- **App Context**: Access to Electron app instance in all handlers

## Quick Start

### 1. Define Your Handlers

```ts
// main/handlers.ts
import { BackendSyncHandlersType, BackendAsyncHandlersType } from '@superflag/super-ipc-backend';
import { app, dialog } from 'electron';
import { AppSyncApi, AppAsyncApi, CHANNELS, ASYNC_CHANNELS } from '../shared/api';

export const syncHandlers: BackendSyncHandlersType<CHANNELS, AppSyncApi> = {
  [CHANNELS.GetAppVersion]: async ({ app, args, event }) => {
    return app.getVersion();
  },
  
  [CHANNELS.ShowOpenDialog]: async ({ app, args, event }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: args.filters || [],
    });
    
    return result.canceled ? null : result.filePaths[0];
  },
};

export const asyncHandlers: BackendAsyncHandlersType<ASYNC_CHANNELS, AppAsyncApi> = {
  [ASYNC_CHANNELS.ProcessLargeFile]: async ({ app, args, event, handlers }) => {
    const { onInit, onProgress, onComplete, onError } = handlers;
    
    try {
      // Initialize
      onInit({ taskId: generateTaskId(), totalSteps: 100 });
      
      // Process with progress updates
      for (let i = 1; i <= 100; i++) {
        await processChunk(args.filePath, i);
        onProgress({ step: i, message: `Processing step ${i}` });
      }
      
      // Complete
      onComplete({ result: 'Processing completed successfully' });
    } catch (error) {
      onError(error);
    }
  },
};
```

### 2. Set Up in Main Process

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

  // Register all IPC handlers
  setupApiHandlers(app, syncHandlers, asyncHandlers, ipcMain);

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

## API Reference

### `setupApiHandlers(app, syncHandlers, asyncHandlers, ipcMain)`

Registers all your IPC handlers with Electron's main process.

**Parameters:**
- `app`: Electron app instance
- `syncHandlers`: Your synchronous request handlers
- `asyncHandlers`: Your asynchronous operation handlers
- `ipcMain`: Electron's ipcMain instance

**Example:**
```ts
import { setupApiHandlers } from '@superflag/super-ipc-backend';
import { app, ipcMain } from 'electron';

setupApiHandlers(app, syncHandlers, asyncHandlers, ipcMain);
```

### Handler Types

#### `BackendSyncHandlersType<TChannel, TApi>`

Type for defining synchronous (promise-based) handlers.

```ts
import { BackendSyncHandlersType } from '@superflag/super-ipc-backend';

const handlers: BackendSyncHandlersType<CHANNELS, MyApi> = {
  [CHANNELS.SomeChannel]: async ({ app, args, event }) => {
    // Handler implementation
    return result;
  },
};
```

**Handler Function Parameters:**
- `app`: Electron app instance
- `args`: Request arguments (typed based on your API definition)
- `event`: IpcMainInvokeEvent from Electron

#### `BackendAsyncHandlersType<TChannel, TApi>`

Type for defining asynchronous handlers with progress updates.

```ts
import { BackendAsyncHandlersType } from '@superflag/super-ipc-backend';

const handlers: BackendAsyncHandlersType<ASYNC_CHANNELS, MyAsyncApi> = {
  [ASYNC_CHANNELS.SomeAsyncChannel]: async ({ app, args, event, handlers }) => {
    const { onInit, onProgress, onComplete, onError } = handlers;
    
    // Implementation with progress tracking
  },
};
```

**Handler Function Parameters:**
- `app`: Electron app instance
- `args`: Request arguments (typed based on your API definition)
- `event`: IpcMainInvokeEvent from Electron
- `handlers`: Progress callback functions
  - `onInit(data)`: Call when operation starts
  - `onProgress(data)`: Call to report progress
  - `onComplete(data)`: Call when operation completes successfully
  - `onError(error)`: Call when operation fails

## Common Usage Patterns

### File System Operations

```ts
import { BackendSyncHandlersType } from '@superflag/super-ipc-backend';
import fs from 'fs/promises';
import path from 'path';

export const fileHandlers: BackendSyncHandlersType<FILE_CHANNELS, FileApi> = {
  [FILE_CHANNELS.ReadFile]: async ({ args }) => {
    try {
      const content = await fs.readFile(args.filePath, 'utf8');
      return { content, encoding: 'utf8' };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },
  
  [FILE_CHANNELS.WriteFile]: async ({ args }) => {
    try {
      await fs.writeFile(args.filePath, args.content, args.encoding || 'utf8');
      const stats = await fs.stat(args.filePath);
      return { 
        success: true, 
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  },
  
  [FILE_CHANNELS.ListDirectory]: async ({ args }) => {
    try {
      const entries = await fs.readdir(args.dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        path: path.join(args.dirPath, entry.name)
      }));
    } catch (error) {
      throw new Error(`Failed to read directory: ${error.message}`);
    }
  },
};
```

### Database Operations

```ts
import { BackendSyncHandlersType, BackendAsyncHandlersType } from '@superflag/super-ipc-backend';
import Database from 'better-sqlite3';

const db = new Database('app.db');

export const dbSyncHandlers: BackendSyncHandlersType<DB_CHANNELS, DatabaseApi> = {
  [DB_CHANNELS.GetUser]: async ({ args }) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(args.userId);
    
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }
    
    return user;
  },
  
  [DB_CHANNELS.CreateUser]: async ({ args }) => {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, created_at) 
      VALUES (?, ?, datetime('now'))
    `);
    
    const result = stmt.run(args.name, args.email);
    return { 
      id: result.lastInsertRowid,
      success: true 
    };
  },
};

export const dbAsyncHandlers: BackendAsyncHandlersType<DB_ASYNC_CHANNELS, DatabaseAsyncApi> = {
  [DB_ASYNC_CHANNELS.ImportUsers]: async ({ args, handlers }) => {
    const { onInit, onProgress, onComplete, onError } = handlers;
    
    try {
      const users = JSON.parse(await fs.readFile(args.filePath, 'utf8'));
      onInit({ totalUsers: users.length, taskId: generateTaskId() });
      
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const transaction = db.transaction((users) => {
        for (let i = 0; i < users.length; i++) {
          stmt.run(users[i].name, users[i].email);
          onProgress({ 
            processed: i + 1, 
            current: users[i].name,
            percent: Math.round(((i + 1) / users.length) * 100)
          });
        }
      });
      
      transaction(users);
      onComplete({ 
        imported: users.length, 
        errors: 0,
        duration: Date.now() - startTime
      });
    } catch (error) {
      onError(error);
    }
  },
};
```

### System Integration

```ts
import { BackendSyncHandlersType } from '@superflag/super-ipc-backend';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const systemHandlers: BackendSyncHandlersType<SYSTEM_CHANNELS, SystemApi> = {
  [SYSTEM_CHANNELS.GetSystemInfo]: async ({ app }) => {
    const { stdout } = await execAsync('uname -a');
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appVersion: app.getVersion(),
      systemInfo: stdout.trim()
    };
  },
  
  [SYSTEM_CHANNELS.OpenExternal]: async ({ args }) => {
    const { shell } = require('electron');
    await shell.openExternal(args.url);
    return { success: true };
  },
  
  [SYSTEM_CHANNELS.ShowInFolder]: async ({ args }) => {
    const { shell } = require('electron');
    shell.showItemInFolder(args.filePath);
    return { success: true };
  },
};
```

### Network Operations

```ts
import { BackendAsyncHandlersType } from '@superflag/super-ipc-backend';
import https from 'https';
import fs from 'fs';

export const networkHandlers: BackendAsyncHandlersType<NETWORK_CHANNELS, NetworkApi> = {
  [NETWORK_CHANNELS.DownloadFile]: async ({ args, handlers }) => {
    const { onInit, onProgress, onComplete, onError } = handlers;
    
    try {
      const file = fs.createWriteStream(args.outputPath);
      
      https.get(args.url, (response) => {
        const totalSize = parseInt(response.headers['content-length'] || '0');
        let downloadedSize = 0;
        
        onInit({ 
          taskId: generateTaskId(),
          totalSize,
          fileName: path.basename(args.outputPath)
        });
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const percent = Math.round((downloadedSize / totalSize) * 100);
          
          onProgress({
            downloadedSize,
            totalSize,
            percent,
            speed: calculateSpeed(downloadedSize, startTime)
          });
        });
        
        response.on('end', () => {
          file.close();
          onComplete({
            filePath: args.outputPath,
            size: downloadedSize,
            duration: Date.now() - startTime
          });
        });
        
        response.pipe(file);
      }).on('error', onError);
    } catch (error) {
      onError(error);
    }
  },
};
```

## Error Handling

### Error Handling in Handlers

```ts
export const handlers = {
  [CHANNELS.ValidateInput]: async ({ args }) => {
    // Input validation
    if (!args.email) {
      throw new Error('Email is required');
    }
    
    if (!isValidEmail(args.email)) {
      throw new Error(`Invalid email format: ${args.email}. Expected format: user@domain.com`);
    }
    
    // Business logic validation
    const existingUser = await findUserByEmail(args.email);
    if (existingUser) {
      throw new Error(`Email already exists: ${args.email}`);
    }
    
    return { valid: true };
  },
};
```

### Handling System Errors

```ts
export const handlers = {
  [CHANNELS.AccessFile]: async ({ args }) => {
    try {
      const content = await fs.readFile(args.filePath, 'utf8');
      return { content };
    } catch (error) {
      // Add context to system errors
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${args.filePath}`);
      }
      
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${args.filePath}`);
      }
      
      // Generic error fallback with context
      throw new Error(`File operation failed for ${args.filePath}: ${error.message}`);
    }
  },
};
```

## Best Practices

### Handler Organization

```ts
// Organize handlers by feature/domain
// handlers/user.ts
export const userHandlers = { /* ... */ };

// handlers/file.ts  
export const fileHandlers = { /* ... */ };

// handlers/index.ts
import { userHandlers } from './user';
import { fileHandlers } from './file';

export const allSyncHandlers = {
  ...userHandlers,
  ...fileHandlers,
};
```

### Async Handler Patterns

```ts
// Always use try-catch in async handlers
[ASYNC_CHANNELS.SomeOperation]: async ({ args, handlers }) => {
  const { onInit, onProgress, onComplete, onError } = handlers;
  
  try {
    onInit({ taskId: generateTaskId() });
    
    // Your async logic here
    
    onComplete(result);
  } catch (error) {
    onError(error); // Always call onError for failures
  }
},
```

### Resource Management

```ts
// Clean up resources properly
[CHANNELS.ProcessFile]: async ({ args }) => {
  let fileHandle;
  
  try {
    fileHandle = await fs.open(args.filePath, 'r');
    const content = await fileHandle.readFile('utf8');
    return processContent(content);
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
},
```

### Performance Considerations

```ts
// Cache expensive operations
const cache = new Map();

export const handlers = {
  [CHANNELS.GetExpensiveData]: async ({ args }) => {
    const cacheKey = `expensive-${args.id}`;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    const result = await expensiveOperation(args);
    cache.set(cacheKey, result);
    
    return result;
  },
};
```

## TypeScript Tips

For the best development experience:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

This ensures your handlers are fully type-safe and catch potential runtime errors at compile time.
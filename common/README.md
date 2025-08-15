# @superflag/super-ipc-core

[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-core.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-core)
[![npm downloads](https://img.shields.io/npm/dm/@superflag/super-ipc-core.svg)](https://www.npmjs.com/package/@superflag/super-ipc-core)

Core types and channel definitions for Super IPC. This package provides the foundational types and utilities that enable type-safe communication between Electron's main and renderer processes.

## Installation

```bash
npm install @superflag/super-ipc-core
```

## What This Package Provides

This package contains:

- **Base Types**: Core TypeScript interfaces for defining IPC contracts
- **Channel Types**: Enums and interfaces for organizing IPC channels
- **Error Handling**: Standardized error types for IPC operations
- **Utility Types**: Helper types for building robust IPC APIs

## Core Concepts

### Sync vs Async Operations

Super IPC supports two types of operations:

- **Sync Operations**: Request-response pattern (promises)
- **Async Operations**: Long-running operations with progress updates

### API Definition Pattern

Define your IPC contract using TypeScript interfaces that extend the base types provided by this package.

## API Reference

### Base Types

#### `BackendSyncApiType<TChannel>`

Base type for defining synchronous (promise-based) IPC operations.

```ts
import { BackendSyncApiType } from '@superflag/super-ipc-core';

enum CHANNELS {
  GetUser = 'GET_USER',
  SaveSettings = 'SAVE_SETTINGS',
}

interface MyApi extends BackendSyncApiType<CHANNELS> {
  [CHANNELS.GetUser]: {
    props: { id: string };
    result: { name: string; email: string };
  };
  [CHANNELS.SaveSettings]: {
    props: { theme: string; language: string };
    result: void;
  };
}
```

#### `BackendAsyncApiType<TChannel>`

Base type for defining asynchronous operations with progress tracking.

```ts
import { BackendAsyncApiType } from '@superflag/super-ipc-core';

enum ASYNC_CHANNELS {
  ProcessFile = 'PROCESS_FILE',
  DownloadUpdate = 'DOWNLOAD_UPDATE',
}

interface MyAsyncApi extends BackendAsyncApiType<ASYNC_CHANNELS> {
  [ASYNC_CHANNELS.ProcessFile]: {
    props: { filePath: string; options: ProcessOptions };
    initResult: { taskId: string; estimatedTime: number };
    progressResult: { percent: number; currentStep: string };
    completeResult: { outputPath: string; stats: ProcessStats };
  };
}
```

### Error Handling

Errors thrown in handlers are automatically wrapped in AppError for consistent error handling across the IPC boundary.

```ts
// In your backend handlers - just throw regular errors
export const handlers = {
  [CHANNELS.GetUser]: async ({ args }) => {
    if (!args.userId) {
      throw new Error('User ID is required');
    }
    
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  },
};
```

The error will be automatically wrapped and sent to the renderer process where it can be caught and handled.

## Usage Examples

### Basic API Definition

```ts
// shared/api.ts
import { BackendSyncApiType, BackendAsyncApiType } from '@superflag/super-ipc-core';

// Define your channels
export enum USER_CHANNELS {
  GetProfile = 'GET_PROFILE',
  UpdateProfile = 'UPDATE_PROFILE',
  DeleteAccount = 'DELETE_ACCOUNT',
}

export enum FILE_CHANNELS {
  OpenFile = 'OPEN_FILE',
  SaveFile = 'SAVE_FILE',
  RecentFiles = 'RECENT_FILES',
}

export enum ASYNC_CHANNELS {
  ImportDatabase = 'IMPORT_DATABASE',
  ExportData = 'EXPORT_DATA',
  SyncWithCloud = 'SYNC_WITH_CLOUD',
}

// Define sync API
export interface UserApi extends BackendSyncApiType<USER_CHANNELS> {
  [USER_CHANNELS.GetProfile]: {
    props: { userId: string };
    result: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      preferences: UserPreferences;
    };
  };
  
  [USER_CHANNELS.UpdateProfile]: {
    props: {
      userId: string;
      updates: Partial<{
        name: string;
        email: string;
        avatar: string;
        preferences: UserPreferences;
      }>;
    };
    result: { success: boolean; updatedAt: string };
  };
  
  [USER_CHANNELS.DeleteAccount]: {
    props: { userId: string; confirmationCode: string };
    result: { success: boolean; deletedAt: string };
  };
}

export interface FileApi extends BackendSyncApiType<FILE_CHANNELS> {
  [FILE_CHANNELS.OpenFile]: {
    props: { filters?: FileFilter[] };
    result: { path: string; content: string; encoding: string } | null;
  };
  
  [FILE_CHANNELS.SaveFile]: {
    props: { 
      path?: string; 
      content: string; 
      encoding?: string 
    };
    result: { path: string; savedAt: string };
  };
  
  [FILE_CHANNELS.RecentFiles]: {
    props: { limit?: number };
    result: Array<{
      path: string;
      name: string;
      lastOpened: string;
      size: number;
    }>;
  };
}

// Define async API for long-running operations
export interface AsyncOperationsApi extends BackendAsyncApiType<ASYNC_CHANNELS> {
  [ASYNC_CHANNELS.ImportDatabase]: {
    props: { 
      filePath: string; 
      options: { 
        overwrite: boolean; 
        validateSchema: boolean 
      } 
    };
    initResult: { 
      taskId: string; 
      totalRecords: number; 
      estimatedDuration: number 
    };
    progressResult: { 
      recordsProcessed: number; 
      currentTable: string; 
      errors: number 
    };
    completeResult: { 
      success: boolean; 
      recordsImported: number; 
      errors: ImportError[]; 
      duration: number 
    };
  };
  
  [ASYNC_CHANNELS.ExportData]: {
    props: { 
      format: 'json' | 'csv' | 'sql'; 
      tables: string[]; 
      outputPath: string 
    };
    initResult: { 
      taskId: string; 
      totalTables: number 
    };
    progressResult: { 
      currentTable: string; 
      tablesCompleted: number; 
      recordsExported: number 
    };
    completeResult: { 
      success: boolean; 
      outputPath: string; 
      fileSize: number; 
      checksum: string 
    };
  };
}
```

### Advanced Type Patterns

#### Conditional API Based on User Role

```ts
import { BackendSyncApiType } from '@superflag/super-ipc-core';

enum ADMIN_CHANNELS {
  GetAllUsers = 'GET_ALL_USERS',
  DeleteUser = 'DELETE_USER',
  ViewLogs = 'VIEW_LOGS',
}

enum USER_CHANNELS {
  GetOwnProfile = 'GET_OWN_PROFILE',
  UpdateOwnProfile = 'UPDATE_OWN_PROFILE',
}

// Different APIs based on user role
export interface AdminApi extends BackendSyncApiType<ADMIN_CHANNELS> {
  [ADMIN_CHANNELS.GetAllUsers]: {
    props: { page: number; limit: number };
    result: { users: User[]; total: number };
  };
  
  [ADMIN_CHANNELS.DeleteUser]: {
    props: { userId: string; reason: string };
    result: { success: boolean };
  };
}

export interface RegularUserApi extends BackendSyncApiType<USER_CHANNELS> {
  [USER_CHANNELS.GetOwnProfile]: {
    props: void;
    result: User;
  };
}

// Combined API type
export type AppApi = AdminApi & RegularUserApi;
```

#### Parameterized Channels

```ts
// Use enums with parameters for dynamic channels
export enum DYNAMIC_CHANNELS {
  GetEntity = 'GET_ENTITY',
  UpdateEntity = 'UPDATE_ENTITY',
  DeleteEntity = 'DELETE_ENTITY',
}

export interface EntityApi<T> extends BackendSyncApiType<DYNAMIC_CHANNELS> {
  [DYNAMIC_CHANNELS.GetEntity]: {
    props: { id: string; include?: string[] };
    result: T | null;
  };
  
  [DYNAMIC_CHANNELS.UpdateEntity]: {
    props: { id: string; data: Partial<T> };
    result: T;
  };
  
  [DYNAMIC_CHANNELS.DeleteEntity]: {
    props: { id: string };
    result: { success: boolean };
  };
}

// Usage
export type UserEntityApi = EntityApi<User>;
export type ProductEntityApi = EntityApi<Product>;
```

## Error Handling Examples

```ts
// In your backend handlers - just throw regular errors
export const handlers = {
  [CHANNELS.GetUser]: async ({ args }) => {
    if (!args.userId) {
      throw new Error('User ID is required');
    }
    
    const user = await getUserById(args.userId);
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }
    
    return user;
  },
  
  [CHANNELS.ProcessFile]: async ({ args }) => {
    try {
      const result = await processFile(args.filePath);
      return result;
    } catch (error) {
      // Re-throw with more context
      throw new Error(`Failed to process file: ${error.message}`);
    }
  },
};
```

## Best Practices

### Channel Organization

```ts
// Group related channels using namespace prefixes
export enum CHANNELS {
  // User operations
  USER_GET_PROFILE = 'USER_GET_PROFILE',
  USER_UPDATE_PROFILE = 'USER_UPDATE_PROFILE',
  USER_DELETE_ACCOUNT = 'USER_DELETE_ACCOUNT',
  
  // File operations  
  FILE_OPEN = 'FILE_OPEN',
  FILE_SAVE = 'FILE_SAVE',
  FILE_RECENT = 'FILE_RECENT',
  
  // Settings operations
  SETTINGS_GET = 'SETTINGS_GET',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
  SETTINGS_RESET = 'SETTINGS_RESET',
}
```

### Type Safety

```ts
// Use branded types for IDs to prevent mixing different entity types
type UserId = string & { __brand: 'UserId' };
type ProductId = string & { __brand: 'ProductId' };

export interface UserApi extends BackendSyncApiType<CHANNELS> {
  [CHANNELS.GetUser]: {
    props: { userId: UserId };  // Won't accept ProductId by mistake
    result: User;
  };
}
```

### Versioning

```ts
// Version your APIs to handle breaking changes
export enum CHANNELS_V1 {
  GetUser = 'v1:GET_USER',
  SaveUser = 'v1:SAVE_USER',
}

export enum CHANNELS_V2 {
  GetUser = 'v2:GET_USER',
  SaveUser = 'v2:SAVE_USER',
}
```

## TypeScript Configuration

For best experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true
  }
}
```

This ensures maximum type safety when defining your IPC contracts.
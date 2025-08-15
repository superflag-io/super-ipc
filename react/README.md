# @superflag/super-ipc-react

[![npm version](https://badge.fury.io/js/@superflag%2Fsuper-ipc-react.svg)](https://badge.fury.io/js/@superflag%2Fsuper-ipc-react)
[![npm downloads](https://img.shields.io/npm/dm/@superflag/super-ipc-react.svg)](https://www.npmjs.com/package/@superflag/super-ipc-react)

React hooks and utilities for Super IPC. This package provides a seamless way to use Super IPC in React applications with automatic state management, loading states, and error handling.

**Inspired by Apollo GraphQL**: Super IPC React follows similar patterns to Apollo Client, providing query hooks for data fetching and mutation hooks for operations that modify data or trigger actions.

## Installation

```bash
npm install @superflag/super-ipc-react
```

## What This Package Provides

- **Query Hooks**: `useBackend` and `useBackendAsync` hooks for data fetching (like Apollo's `useQuery`)
- **Mutation Hooks**: `useBackendMutation` for triggering operations on demand (like Apollo's `useMutation`)
- **Automatic State Management**: Loading, error, and success states handled automatically
- **Type Safety**: Full TypeScript support with IntelliSense
- **Real-time Updates**: Live progress tracking for async operations
- **Error Boundaries**: Built-in error handling and recovery
- **Caching**: Optional response caching for performance

## Quick Start

### 1. Create Your Hooks

```tsx
// hooks/useIpc.ts
import {
  createUseBackendSyncHook,
  createUseBackendMutationSyncHook,
  createUseBackendAsyncHook,
} from '@superflag/super-ipc-react';
import type { CHANNELS, ASYNC_CHANNELS, AppSyncApi, AppAsyncApi } from '../shared/api';

// Create typed hooks for your app
export const useBackend = createUseBackendSyncHook<CHANNELS, AppSyncApi>();
export const useBackendMutation = createUseBackendMutationSyncHook<CHANNELS, AppSyncApi>();
export const useBackendAsync = createUseBackendAsyncHook<ASYNC_CHANNELS, AppAsyncApi>();

// Hook to access app version
export { useAppVersion } from '@superflag/super-ipc-react';
```

### 2. Use in Components

```tsx
// components/UserProfile.tsx
import React from 'react';
import { useBackend } from '../hooks/useIpc';
import { CHANNELS } from '../shared/api';

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useBackend({
    channel: CHANNELS.GetUserProfile,
    props: { userId },
  });

  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <img src={user.avatar} alt={user.name} />
    </div>
  );
}
```

```tsx
// components/FileProcessor.tsx
import React, { useState } from 'react';
import { useBackendAsync } from '../hooks/useIpc';
import { ASYNC_CHANNELS } from '../shared/api';

export function FileProcessor() {
  const [filePath, setFilePath] = useState('');
  
  const {
    initialData,
    lastProgressData,
    completeData,
    loading,
    error,
    refetch,
  } = useBackendAsync({
    channel: ASYNC_CHANNELS.ProcessLargeFile,
    skip: true, // Don't auto-start
  });

  const handleStart = () => {
    refetch({
      filePath,
      options: { format: 'optimized', compression: true },
    });
  };

  return (
    <div>
      <input 
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        placeholder="Enter file path"
        disabled={loading}
      />
      
      <button onClick={handleStart} disabled={loading || !filePath}>
        {loading ? 'Processing...' : 'Start Processing'}
      </button>

      {loading && initialData && lastProgressData && (
        <div>
          <div>Task: {initialData.taskId}</div>
          <progress value={lastProgressData.step} max={initialData.totalSteps} />
          <div>{lastProgressData.message}</div>
        </div>
      )}

      {completeData && (
        <div>
          <h3>Processing Complete!</h3>
          <p>Output: {completeData.outputPath}</p>
          <p>Summary: {completeData.summary}</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### `createUseBackendSyncHook<TChannel, TApi>()`

Creates a hook for synchronous (promise-based) IPC operations.

**Returns:** Hook function with the following signature:
```ts
function useBackend(options: {
  channel: TChannel;
  props?: TProps;
  skip?: boolean;
  keepDataDuringRefetch?: boolean;
}): {
  data?: TResult;
  error?: any;
  loading: boolean;
  refetch: (props?: TProps) => Promise<any>;
}
```

### `createUseBackendAsyncHook<TChannel, TApi>()`

Creates a hook for asynchronous operations with progress tracking.

**Returns:** Hook function with the following signature:
```ts
function useBackendAsync(options: {
  channel: TChannel;
  props?: TProps;
  skip?: boolean;
  keepDataDuringRefetch?: boolean;
  onInit?: (data: TInitResult) => void;
  onProgress?: (data: TProgressResult) => void;
  onComplete?: (data: TCompleteResult) => void;
}): {
  initialData?: TInitResult;
  progressData?: TProgressResult[];
  lastProgressData?: TProgressResult;
  completeData?: TCompleteResult;
  error?: any;
  loading: boolean;
  refetch: (props?: TProps) => Promise<any>;
}
```

### `createUseBackendMutationSyncHook<TChannel, TApi>()`

Creates a mutation hook for operations that should be triggered manually (like Apollo's `useMutation`).

**Returns:** Hook function with the following signature:
```ts
function useBackendMutation(options: {
  channel: TChannel;
  props?: TProps;
  keepDataDuringRefetch?: boolean;
}): [
  (props?: TProps) => Promise<any>, // The mutation function
  {
    data?: TResult;
    error?: any;
    loading: boolean;
  }
]
```

### `TypedElectronApi<TSyncChannels, TAsyncChannels, TSyncApi, TAsyncApi>`

Generic interface for type-safe access to the electronApi exposed by the preloader. 

**⚠️ Note**: For most use cases, prefer using the mutation hooks (`useBackendMutation`, `useBackendAsync`) instead of calling `electronApi.invoke` directly. This interface is provided for advanced use cases or operations not currently supported by the hook system.

**Type Parameters:**
- `TSyncChannels` - Union type of all sync channel names
- `TAsyncChannels` - Union type of all async channel names  
- `TSyncApi` - Sync API type extending BackendSyncApiType
- `TAsyncApi` - Async API type extending BackendAsyncApiType

**Usage (Advanced - prefer mutation hooks):**
```ts
// types/electron.d.ts - only if you need direct electronApi access
import type { TypedElectronApi } from '@superflag/super-ipc-react';
import type { CHANNELS, ASYNC_CHANNELS, AppSyncApi, AppAsyncApi } from '../shared/api';

declare global {
  interface Window {
    electronApi: TypedElectronApi<CHANNELS, ASYNC_CHANNELS, AppSyncApi, AppAsyncApi>;
  }
}
```

## Usage Examples

**Apollo GraphQL Pattern**: Super IPC React follows Apollo Client patterns:
- **Query hooks** (`useBackend`, `useBackendAsync`) automatically fetch data when components mount
- **Mutation hooks** (`useBackendMutation`) return a function to trigger operations manually
- Both provide `{ data, loading, error }` state management

### Basic Data Fetching (Query Pattern)

```tsx
import React from 'react';
import { useBackend, useAppVersion } from '../hooks/useIpc';

function AppInfo() {
  // Get app version directly from preloader (no IPC call needed)
  const appVersion = useAppVersion();
  
  // Get additional app data via IPC
  const { data: appData, loading, error } = useBackend({
    channel: CHANNELS.GetAppInfo,
    props: undefined, // No props needed
  });

  return (
    <div>
      <div>App Version: {appVersion}</div>
      {loading ? (
        'Loading app data...'
      ) : (
        <div>Build: {appData?.buildNumber}</div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Conditional Fetching

```tsx
function UserProfile({ userId, shouldLoad }: { userId: string; shouldLoad: boolean }) {
  const { data: user, loading } = useBackend({
    channel: CHANNELS.GetUserProfile,
    props: { userId },
    skip: !shouldLoad || !userId, // Skip when conditions not met
  });

  return (
    <div>
      {loading && <div>Loading user...</div>}
      {user && <div>Hello {user.name}!</div>}
    </div>
  );
}
```

### Manual Refetching

```tsx
function RefreshableUserList() {
  const { data: users, loading, error, refetch } = useBackend({
    channel: CHANNELS.GetAllUsers,
    props: { limit: 50 },
  });

  return (
    <div>
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Users'}
      </button>
      
      {error && <div>Error: {error.message}</div>}
      
      {users && (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Mutation Hook Pattern (Like Apollo GraphQL)

```tsx
import React, { useState } from 'react';
import { useBackendMutation } from '../hooks/useIpc';
import { CHANNELS } from '../shared/api';

function CreateUser() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Similar to Apollo's useMutation - returns [mutationFunction, { data, loading, error }]
  const [createUser, { data: createdUser, loading, error }] = useBackendMutation({
    channel: CHANNELS.CreateUser,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createUser({ name, email });
      console.log('User created:', result);
      
      // Reset form on success
      setName('');
      setEmail('');
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Name" 
        disabled={loading}
      />
      <input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Email" 
        disabled={loading}
      />
      <button type="submit" disabled={loading || !name || !email}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      
      {createdUser && (
        <div style={{ color: 'green' }}>
          User "{createdUser.name}" created successfully!
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
        </div>
      )}
    </form>
  );
}
```

### File Upload with Progress

```tsx
function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    initiate,
    data: uploadInfo,
    progress,
    result,
    loading,
    error,
    cancel,
  } = useBackendAsync({
    channel: ASYNC_CHANNELS.UploadFile,
    onInit: (data) => {
      console.log('Upload started:', data.uploadId);
    },
    onProgress: (data) => {
      console.log('Upload progress:', data.percent + '%');
    },
    onComplete: (data) => {
      console.log('Upload completed:', data.url);
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    // In a real app, you might save the file to a temp location first
    const tempPath = await saveFileToTemp(selectedFile);
    
    initiate({
      filePath: tempPath,
      fileName: selectedFile.name,
      contentType: selectedFile.type,
    });
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        disabled={loading}
      />
      
      <button onClick={handleUpload} disabled={!selectedFile || loading}>
        {loading ? 'Uploading...' : 'Upload File'}
      </button>
      
      {loading && (
        <button onClick={cancel}>Cancel Upload</button>
      )}

      {loading && uploadInfo && progress && (
        <div>
          <div>Uploading: {uploadInfo.fileName}</div>
          <progress value={progress.bytesUploaded} max={uploadInfo.totalBytes} />
          <div>{progress.percent}% complete</div>
          <div>Speed: {formatSpeed(progress.speed)}</div>
        </div>
      )}

      {result && (
        <div>
          <h3>Upload Successful!</h3>
          <p>File URL: <a href={result.url}>{result.url}</a></p>
          <p>Size: {formatFileSize(result.size)}</p>
        </div>
      )}

      {error && (
        <div style={{ color: 'red' }}>
          Upload failed: {error.message}
        </div>
      )}
    </div>
  );
}
```

### Data Export with Progress

```tsx
function DataExporter() {
  const [format, setFormat] = useState<'json' | 'csv' | 'xlsx'>('json');
  
  const {
    initiate,
    data: exportInfo,
    progress,
    result,
    loading,
    error,
  } = useBackendAsync({
    channel: ASYNC_CHANNELS.ExportData,
  });

  const handleExport = () => {
    initiate({
      format,
      tables: ['users', 'products', 'orders'],
      includeMedia: true,
    });
  };

  return (
    <div>
      <select 
        value={format} 
        onChange={(e) => setFormat(e.target.value as any)}
        disabled={loading}
      >
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
        <option value="xlsx">Excel</option>
      </select>
      
      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
      </button>

      {loading && exportInfo && progress && (
        <div>
          <h4>Exporting Data...</h4>
          <div>Processing table: {progress.currentTable}</div>
          <progress value={progress.tablesComplete} max={exportInfo.totalTables} />
          <div>{progress.tablesComplete} of {exportInfo.totalTables} tables</div>
          <div>{progress.recordsExported} records exported</div>
        </div>
      )}

      {result && (
        <div>
          <h3>Export Complete!</h3>
          <p>File: {result.filePath}</p>
          <p>Size: {formatFileSize(result.fileSize)}</p>
          <p>Records: {result.totalRecords}</p>
          <button onClick={() => window.electronApi.invoke('OPEN_FILE_LOCATION', { path: result.filePath })}>
            Show in Folder
          </button>
        </div>
      )}

      {error && (
        <div>Export failed: {error.message}</div>
      )}
    </div>
  );
}
```

### Real-time System Monitoring

```tsx
function SystemMonitor() {
  const {
    initiate,
    progress: stats,
    loading,
    error,
    cancel,
  } = useBackendAsync({
    channel: ASYNC_CHANNELS.MonitorSystem,
    onProgress: (data) => {
      // Real-time system stats
      console.log('System stats updated:', data);
    },
  });

  useEffect(() => {
    // Start monitoring on component mount
    initiate({ interval: 5000 }); // Update every 5 seconds
    
    return () => {
      // Stop monitoring on unmount
      cancel();
    };
  }, []);

  if (!loading && !stats) {
    return <div>System monitoring not started</div>;
  }

  return (
    <div>
      <h3>System Monitor</h3>
      
      {loading && (
        <div>
          <span>🟢 Monitoring active</span>
          <button onClick={cancel}>Stop Monitoring</button>
        </div>
      )}

      {stats && (
        <div>
          <div>CPU Usage: {stats.cpuUsage}%</div>
          <div>Memory Usage: {stats.memoryUsage}%</div>
          <div>Disk Usage: {stats.diskUsage}%</div>
          <div>Network: ↓{formatBytes(stats.networkDown)} ↑{formatBytes(stats.networkUp)}</div>
          <div>Last updated: {new Date(stats.timestamp).toLocaleTimeString()}</div>
        </div>
      )}

      {error && (
        <div>Monitoring error: {error.message}</div>
      )}
    </div>
  );
}
```

## Advanced Patterns

### Custom Hook with Business Logic

```tsx
// hooks/useUserManagement.ts
import { useState } from 'react';
import { useBackend } from './useIpc';

export function useUserManagement() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const { data: users, loading: loadingUsers, refetch: refreshUsers } = useBackend({
    channel: CHANNELS.GetAllUsers,
    props: { includeInactive: false },
  });
  
  const { data: userDetails, loading: loadingDetails } = useBackend({
    channel: CHANNELS.GetUserDetails,
    props: { userId: selectedUser! },
    enabled: !!selectedUser,
  });

  const selectUser = (userId: string) => {
    setSelectedUser(userId);
  };

  const clearSelection = () => {
    setSelectedUser(null);
  };

  return {
    users,
    selectedUser: userDetails,
    selectedUserId: selectedUser,
    loading: loadingUsers || loadingDetails,
    selectUser,
    clearSelection,
    refreshUsers,
  };
}
```

### Error Boundary Integration

```tsx
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class IpcErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('IPC Error caught by boundary:', error, errorInfo);
    
    // Report to error tracking service
    window.electronApi?.invoke('REPORT_ERROR', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong with IPC communication</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <IpcErrorBoundary>
      <UserProfile userId="123" />
      <FileProcessor />
    </IpcErrorBoundary>
  );
}
```

### Loading States and Skeletons

```tsx
// components/UserProfileSkeleton.tsx
function UserProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-48 mb-4"></div>
      <div className="h-4 bg-gray-300 rounded w-64 mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-56"></div>
    </div>
  );
}

function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useBackend({
    channel: CHANNELS.GetUserProfile,
    props: { userId },
  });

  if (loading) return <UserProfileSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <EmptyState message="User not found" />;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

## Best Practices

### Performance Optimization

```tsx
// Use React.memo for components that receive stable props
const UserCard = React.memo(({ userId }: { userId: string }) => {
  const { data: user, loading } = useBackend({
    channel: CHANNELS.GetUserProfile,
    props: { userId },
  });

  if (loading) return <Skeleton />;
  return <div>{user?.name}</div>;
});

// Use useMemo for expensive computations
function UserList() {
  const { data: users } = useBackend({
    channel: CHANNELS.GetAllUsers,
    props: {},
  });

  const sortedUsers = useMemo(() => {
    return users?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [users]);

  return (
    <div>
      {sortedUsers.map(user => (
        <UserCard key={user.id} userId={user.id} />
      ))}
    </div>
  );
}
```

### Error Handling

```tsx
// Centralized error handling
function useErrorHandler() {
  return useCallback((error: Error) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('IPC Error:', error);
    }
    
    // Report to error tracking
    window.electronApi?.invoke('REPORT_ERROR', {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
    
    // Show user-friendly message
    toast.error('Something went wrong. Please try again.');
  }, []);
}

function MyComponent() {
  const handleError = useErrorHandler();
  
  const { data, error } = useBackend({
    channel: CHANNELS.GetData,
    props: {},
    onError: handleError,
  });

  // Component implementation
}
```

### Type Safety

```tsx
// Define strict prop types
interface UserProfileProps {
  userId: string;
  showDetails?: boolean;
}

function UserProfile({ userId, showDetails = false }: UserProfileProps) {
  // TypeScript will enforce correct channel and props types
  const { data, loading, error } = useBackend({
    channel: CHANNELS.GetUserProfile, // Must be a valid channel
    props: { userId }, // Must match the expected props type
  });

  return (
    <div>
      {/* Type-safe access to data properties */}
      {data && (
        <div>
          <h2>{data.name}</h2> {/* TypeScript knows data.name exists */}
          <p>{data.email}</p>
          {showDetails && <p>{data.bio}</p>}
        </div>
      )}
    </div>
  );
}
```

The React package makes IPC communication feel native to React development while maintaining type safety and providing excellent developer experience!
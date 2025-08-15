import type {
  BackendAsyncApiType,
  BackendResult,
  BackendSyncApiType,
} from '@superflag/super-ipc-core';

interface CommonHookProps {
  skip?: boolean;
  keepDataDuringRefetch?: boolean;
}

export interface BackendApiHookResult<
  CHANNEL extends string,
  API extends BackendSyncApiType<CHANNEL>,
> {
  data?: API[CHANNEL]['result'];
  error?: BackendResult['error'];
  loading: boolean;
  refetch: (
    props?: API[CHANNEL]['props'],
  ) => Promise<Omit<BackendApiHookResult<CHANNEL, API>, 'refetch'>>;
}

export interface BackendApiHookProps<
  CHANNEL extends string,
  API extends BackendSyncApiType<CHANNEL>,
> extends CommonHookProps {
  channel: CHANNEL;
  props?: API[CHANNEL]['props'];
}

export interface BackendApiAsyncHookResult<
  CHANNEL extends string,
  API extends BackendAsyncApiType<CHANNEL>,
> {
  initialData?: API[CHANNEL]['initResult'];
  progressData?: API[CHANNEL]['progressResult'][];
  lastProgressData?: API[CHANNEL]['progressResult'];
  completeData?: API[CHANNEL]['completeResult'];

  error?: BackendResult['error'];

  loading: boolean;
  refetch: (props?: API[CHANNEL]['props']) => Promise<BackendResult<void>>;
}

export interface BackendApiAsyncHookProps<
  CHANNEL extends string,
  API extends BackendAsyncApiType<CHANNEL>,
> extends CommonHookProps {
  channel: CHANNEL;
  props?: API[CHANNEL]['props'];
  // handlers
  onInit?: (event: API[CHANNEL]['initResult']) => void;
  onProgress?: (event: API[CHANNEL]['progressResult']) => void;
  onComplete?: (event: API[CHANNEL]['completeResult']) => void;
}

/**
 * Generic typed interface for the electronApi exposed by the preload script.
 * Provides type-safe access to both sync and async IPC operations.
 * 
 * Note: For most use cases, prefer using the mutation hooks (createUseBackendSyncHook, 
 * createUseBackendAsyncHook) instead of calling electronApi.invoke directly.
 * 
 * @template SYNC_CHANNELS - Union type of all sync channel names
 * @template ASYNC_CHANNELS - Union type of all async channel names  
 * @template SYNC_API - Sync API type extending BackendSyncApiType
 * @template ASYNC_API - Async API type extending BackendAsyncApiType
 */
export interface TypedElectronApi<
  SYNC_CHANNELS extends string = string,
  ASYNC_CHANNELS extends string = string,
  SYNC_API extends BackendSyncApiType<SYNC_CHANNELS> = BackendSyncApiType<SYNC_CHANNELS>,
  ASYNC_API extends BackendAsyncApiType<ASYNC_CHANNELS> = BackendAsyncApiType<ASYNC_CHANNELS>
> {
  /**
   * Invoke a sync or async IPC channel
   * @param channel - The channel name (sync or async)
   * @param args - Arguments for the channel (for sync channels)
   * @param callId - Call ID for async channels (auto-generated if not provided)
   */
  invoke<T extends SYNC_CHANNELS>(
    channel: T,
    ...args: SYNC_API[T]['props'] extends void 
      ? [] 
      : [SYNC_API[T]['props']]
  ): Promise<BackendResult<SYNC_API[T]['result']>>;
  
  invoke<T extends ASYNC_CHANNELS>(
    channel: T,
    args: ASYNC_API[T]['props'],
    callId?: number
  ): Promise<BackendResult<void>>;

  /**
   * Listen for async IPC progress updates
   * @param channel - The async reply channel name  
   * @param callback - Callback function to handle progress updates
   */
  on(channel: string, callback: (...args: any[]) => void): void;

  /**
   * Remove a listener for async IPC progress updates
   * @param channel - The async reply channel name
   * @param callback - The callback function to remove
   */
  removeListener(channel: string, callback: (...args: any[]) => void): void;

  /**
   * App version exposed by the preloader
   */
  version: string;
}

import {
  AppError,
  ASYNC_REPLY_SUFFIX,
  MAX_CALL_ID,
  type BackendAsyncApiType,
  type BackendResult,
  BackendResultMode,
  type BackendSyncApiType,
} from '@superflag/super-ipc-core';
import type {
  BackendApiAsyncHookProps,
  BackendApiAsyncHookResult,
  BackendApiHookProps,
  BackendApiHookResult,
} from './types';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Gets the Electron API from the global window object
 * @throws {Error} When electronApi is not found or preload script is not properly configured
 * @returns The Electron API instance
 */
const getElectronApi = () => {
  const electronApi = (window as any).electronApi;
  if (!electronApi) {
    throw new Error(
      'electronApi not found. Ensure that:\n' +
        '1. The preload script is correctly configured in your main process\n' +
        '2. registerElectronApiBridge() is called in your preload script\n' +
        '3. contextIsolation is enabled and nodeIntegration is disabled\n' +
        '4. The preload script path is correct in BrowserWindow webPreferences',
    );
  }
  return electronApi;
};

function handleError<T>(
  response: BackendResult<T>,
  setError: (value: any) => void,
) {
  if (response.error) {
    try {
      console.error(response.error);
      setError(AppError.fromJSON(response.error));
    } catch (err) {
      console.error(
        'received error that is not an AppError',
        response.error,
        err,
      );
      setError(response.error);
    }
  }
}

function tryParseData<T>(response: BackendResult): T | undefined {
  try {
    return response.content ? JSON.parse(response.content) : undefined;
  } catch (err) {
    console.error('Invalid json response', err);
    return undefined;
  }
}

/**
 * Raw hook for making synchronous IPC calls to the backend
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend sync API type definition
 * @template CHANNEL - Specific channel being used
 * @param options - Hook configuration options
 * @param options.channel - The IPC channel to call
 * @param options.props - Arguments to pass to the backend handler
 * @param options.skip - Whether to skip the initial request
 * @param options.keepDataDuringRefetch - Whether to keep existing data during refetch
 * @returns Object containing data, error, loading state, and refetch function
 */
export const useBackendRaw = <
  ALL_CHANNELS extends string,
  API extends BackendSyncApiType<ALL_CHANNELS>,
  CHANNEL extends ALL_CHANNELS,
>({
  channel,
  props,
  skip,
  keepDataDuringRefetch,
}: BackendApiHookProps<CHANNEL, API>): BackendApiHookResult<CHANNEL, API> => {
  const [loading, setLoading] = useState(!skip);
  const [data, setData] = useState<API[CHANNEL]['result']>();
  const [error, setError] = useState<BackendResult['error']>();

  const makeRequest = useCallback(
    (propOverrides?: API[CHANNEL]['props']) => {
      if (!loading) {
        setLoading(true);
      }
      setError(undefined);
      if (!keepDataDuringRefetch && data) {
        setData(undefined);
      }
      return getElectronApi()
        .invoke(channel, propOverrides ?? props)
        .then((response: BackendResult) => {
          let receivedData: API[CHANNEL]['result'] | undefined;
          if (response.content) {
            receivedData = tryParseData(response);
            if (receivedData) {
              setData(receivedData);
            }
          }

          handleError(response, setError);

          setLoading(false);
          return {
            data: receivedData,
            error: response.error,
            resultMode: BackendResultMode.Complete,
          } as BackendResult<API[CHANNEL]['result']>;
        })
        .catch((err: any) => {
          handleError(
            { error: err, resultMode: BackendResultMode.Complete },
            setError,
          );
          setLoading(false);
        });
    },
    [channel, loading, props],
  );

  useEffect(() => {
    if (!skip) {
      makeRequest(props);
    }
  }, []);

  return {
    data,
    error,
    loading,
    refetch: makeRequest,
  };
};

/**
 * Raw hook for making synchronous IPC mutations (calls that don't execute on mount)
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend sync API type definition
 * @template CHANNEL - Specific channel being used
 * @param props - Hook configuration options (excluding skip)
 * @returns Tuple of [trigger function, result object with data/error/loading]
 */
export const useBackendMutationRaw = <
  ALL_CHANNELS extends string,
  API extends BackendSyncApiType<ALL_CHANNELS>,
  CHANNEL extends ALL_CHANNELS,
>(
  props: Omit<BackendApiHookProps<CHANNEL, API>, 'skip'>,
): [
  BackendApiHookResult<CHANNEL, API>['refetch'],
  BackendApiHookResult<CHANNEL, API>,
] => {
  const result = useBackendRaw({ ...props, skip: true });

  return [result.refetch, result];
};

/**
 * Raw hook for making asynchronous IPC calls with progress tracking
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend async API type definition
 * @template CHANNEL - Specific channel being used
 * @param options - Hook configuration options
 * @param options.channel - The IPC channel to call
 * @param options.props - Arguments to pass to the backend handler
 * @param options.skip - Whether to skip the initial request
 * @param options.keepDataDuringRefetch - Whether to keep existing data during refetch
 * @param options.onInit - Callback fired when async operation initializes
 * @param options.onProgress - Callback fired on each progress update
 * @param options.onComplete - Callback fired when operation completes
 * @returns Object containing initial data, progress data, complete data, error, loading state, and refetch function
 */
export const useBackendAsyncRaw = <
  ALL_CHANNELS extends string,
  API extends BackendAsyncApiType<CHANNEL>,
  CHANNEL extends ALL_CHANNELS,
>({
  channel,
  props,
  skip,
  keepDataDuringRefetch,
  onInit,
  onProgress,
  onComplete,
}: BackendApiAsyncHookProps<CHANNEL, API>): BackendApiAsyncHookResult<
  CHANNEL,
  API
> => {
  const [loading, setLoading] = useState(!skip);
  const [initialData, setInitialData] = useState<API[CHANNEL]['initResult']>();
  const [progressData, setProgressData] = useState<
    API[CHANNEL]['progressResult'][]
  >([]);
  const [completeData, setCompleteData] =
    useState<API[CHANNEL]['completeResult']>();
  const [error, setError] = useState<BackendResult['error']>();
  const callId = useRef(Math.round(Math.random() * MAX_CALL_ID));
  const replyChannel = channel + ASYNC_REPLY_SUFFIX;

  // status listener
  const listener = useCallback(
    (event: any, result: BackendResult) => {
      if (result.callId !== callId.current) {
        // exit early if not same origin
        return;
      }

      if (completeData) {
        throw new AppError('Async data received after onComplete processed', {
          context: { result },
        });
      }

      handleError(result, setError);

      if (result.content) {
        if (result.resultMode === BackendResultMode.Init) {
          const parsedData = tryParseData<API[CHANNEL]['initResult']>(result);
          if (parsedData) {
            setInitialData(parsedData);
            onInit?.(parsedData);
          }
        } else if (result.resultMode === BackendResultMode.Progress) {
          const parsedData =
            tryParseData<API[CHANNEL]['progressResult']>(result);
          if (parsedData) {
            setProgressData((currentProgressData) => [
              ...currentProgressData,
              parsedData,
            ]);
            onProgress?.(parsedData);
          }
        } else if (result.resultMode === BackendResultMode.Complete) {
          const parsedData =
            tryParseData<API[CHANNEL]['completeResult']>(result);
          if (parsedData) {
            setCompleteData(parsedData);
            onComplete?.(parsedData);
          }
        }
      }

      if (result.resultMode === BackendResultMode.Complete) {
        setLoading(false);
      }
    },
    [
      setLoading,
      setCompleteData,
      setProgressData,
      setError,
      onComplete,
      onInit,
      onProgress,
    ],
  );
  const prevListener = useRef(listener);

  useEffect(() => {
    const electronApi = getElectronApi();
    electronApi.removeListener(replyChannel, prevListener.current);
    electronApi.on(replyChannel, listener);
    prevListener.current = listener;

    // remove on unmount
    return () => getElectronApi().removeListener(replyChannel, listener);
  }, [listener]);

  const makeRequest = useCallback(
    (propOverrides?: API[CHANNEL]['props']) => {
      callId.current = Math.round(Math.random() * MAX_CALL_ID);

      // clear states
      if (!keepDataDuringRefetch) {
        setInitialData(undefined);
        setProgressData([]);
        setCompleteData(undefined);
      }
      setError(undefined);
      setLoading(true);

      return getElectronApi()
        .invoke(channel, propOverrides ?? props, callId.current)
        .then((response: BackendResult<void>) => {
          handleError(response, setError);
          return {
            error: response.error,
            resultMode: BackendResultMode.Complete,
          } as BackendResult<void>;
        });
    },
    [channel, loading, props],
  );

  useEffect(() => {
    if (!skip) {
      makeRequest(props);
    }
  }, []);

  return {
    initialData,
    progressData,
    lastProgressData: progressData?.[progressData.length - 1],
    completeData,
    error,
    loading,
    refetch: makeRequest,
  };
};

/**
 * Creates a typed hook factory for synchronous backend calls
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend sync API type definition
 * @returns A hook factory function that can be used to create typed backend hooks
 */
export const createUseBackendSyncHook = <
  ALL_CHANNELS extends string,
  API extends BackendSyncApiType<ALL_CHANNELS>,
>() => {
  return <CHANNEL extends ALL_CHANNELS>(
    props: BackendApiHookProps<CHANNEL, API>,
  ): BackendApiHookResult<CHANNEL, API> =>
    useBackendRaw<ALL_CHANNELS, API, CHANNEL>(props);
};

/**
 * Creates a typed hook factory for synchronous backend mutations
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend sync API type definition
 * @returns A hook factory function that creates mutation hooks (calls that don't execute on mount)
 */
export const createUseBackendMutationSyncHook = <
  ALL_CHANNELS extends string,
  API extends BackendSyncApiType<ALL_CHANNELS>,
>() => {
  return <CHANNEL extends ALL_CHANNELS>(
    props: Omit<BackendApiHookProps<CHANNEL, API>, 'skip'>,
  ): [
    BackendApiHookResult<CHANNEL, API>['refetch'],
    BackendApiHookResult<CHANNEL, API>,
  ] => useBackendMutationRaw<ALL_CHANNELS, API, CHANNEL>(props);
};

/**
 * Creates a typed hook factory for asynchronous backend calls with progress tracking
 * @template ALL_CHANNELS - Union of all available channel names
 * @template API - The backend async API type definition
 * @returns A hook factory function that creates async hooks with init/progress/complete tracking
 */
export const createUseBackendAsyncHook = <
  ALL_CHANNELS extends string,
  API extends BackendAsyncApiType<ALL_CHANNELS>,
>() => {
  return <CHANNEL extends ALL_CHANNELS>(
    props: BackendApiAsyncHookProps<CHANNEL, API>,
  ): BackendApiAsyncHookResult<CHANNEL, API> =>
    useBackendAsyncRaw<ALL_CHANNELS, API, CHANNEL>(props);
};

/**
 * Hook to get the app version exposed by the preloader
 * @returns The application version string, or 'Unknown' if not available
 */
export const useAppVersion = (): string => {
  try {
    return getElectronApi().version || 'Unknown';
  } catch (error) {
    console.warn('Could not get app version:', error);
    return 'Unknown';
  }
};

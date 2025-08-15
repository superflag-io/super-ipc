import {
  AppError,
  ASYNC_REPLY_SUFFIX,
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

const getElectronApi = () => {
  const electronApi = (window as any).electronApi;
  if (!electronApi) {
    throw new Error(
      'electronApi not found. Ensure that:\n' +
      '1. The preload script is correctly configured in your main process\n' +
      '2. registerElectronApiBridge() is called in your preload script\n' +
      '3. contextIsolation is enabled and nodeIntegration is disabled\n' +
      '4. The preload script path is correct in BrowserWindow webPreferences'
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
      console.error('received error that is not an AppError', response.error);
      setError(response.error);
    }
  }
}

function tryParseData<T>(response: BackendResult): T | undefined {
  try {
    return response.content ? JSON.parse(response.content) : undefined;
  } catch (err) {
    console.error('Invalid json response');
    return undefined;
  }
}

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

export const useBackendAsyncRaw = <
  ALL_CHANNELS extends string,
  API extends BackendAsyncApiType<CHANNEL>,
  CHANNEL extends string,
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
  const callId = useRef(Math.round(Math.random() * 100000));
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
      callId.current = Math.round(Math.random() * 100000);

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

export const createUseBackendSyncHook = <
  ALL_CHANNELS extends string,
  API extends BackendSyncApiType<ALL_CHANNELS>,
>() => {
  return <CHANNEL extends ALL_CHANNELS>(
    props: BackendApiHookProps<CHANNEL, API>,
  ): BackendApiHookResult<CHANNEL, API> =>
    useBackendRaw<ALL_CHANNELS, API, CHANNEL>(props);
};

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
 */
export const useAppVersion = (): string => {
  try {
    return getElectronApi().version || 'Unknown';
  } catch (error) {
    console.warn('Could not get app version:', error);
    return 'Unknown';
  }
};

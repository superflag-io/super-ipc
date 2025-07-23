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
  ) => Promise<BackendResult<API[CHANNEL]['result']>>;
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

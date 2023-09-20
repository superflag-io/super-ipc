export enum BackendResultMode {
  Init = 'INIT',
  Progress = 'PROGRESS',
  Complete = 'COMPLETE',
}

export interface BackendResult<T = string> {
  error?: {
    message: string;
  } & any;
  content?: T;
  resultMode: BackendResultMode;
  callId?: number;
}

export type DeepPartial<T> = T extends object
  ? {
    [P in keyof T]?: DeepPartial<T[P]>;
  }
  : T;

export const ASYNC_REPLY_SUFFIX = '-ASYNC_REPLY';

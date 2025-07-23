export type BackendSyncApiType<
  C extends string,
  T = unknown,
  U = unknown,
> = Record<
  C,
  {
    props: T;
    result: U;
  }
>;

export type BackendAsyncApiType<
  C extends string,
  T = unknown,
  U = unknown,
  V = unknown,
  W = unknown,
> = Record<
  C,
  {
    props: T;
    initResult: U;
    progressResult: V;
    completeResult: W;
  }
>;

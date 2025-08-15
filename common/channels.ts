/**
 * Type definition for synchronous backend API channels
 * @template CHANNEL_NAMES - Union type of channel names (string enum)
 * @template PROPS_TYPE - Type of input properties/arguments
 * @template RESULT_TYPE - Type of result/return value
 */
export type BackendSyncApiType<
  CHANNEL_NAMES extends string,
  PROPS_TYPE = unknown,
  RESULT_TYPE = unknown,
> = Record<
  CHANNEL_NAMES,
  {
    props: PROPS_TYPE;
    result: RESULT_TYPE;
  }
>;

/**
 * Type definition for asynchronous backend API channels with progress tracking
 * @template CHANNEL_NAMES - Union type of channel names (string enum)
 * @template PROPS_TYPE - Type of input properties/arguments
 * @template INIT_RESULT_TYPE - Type of initialization result data
 * @template PROGRESS_RESULT_TYPE - Type of progress update data
 * @template COMPLETE_RESULT_TYPE - Type of completion result data
 */
export type BackendAsyncApiType<
  CHANNEL_NAMES extends string,
  PROPS_TYPE = unknown,
  INIT_RESULT_TYPE = unknown,
  PROGRESS_RESULT_TYPE = unknown,
  COMPLETE_RESULT_TYPE = unknown,
> = Record<
  CHANNEL_NAMES,
  {
    props: PROPS_TYPE;
    initResult: INIT_RESULT_TYPE;
    progressResult: PROGRESS_RESULT_TYPE;
    completeResult: COMPLETE_RESULT_TYPE;
  }
>;

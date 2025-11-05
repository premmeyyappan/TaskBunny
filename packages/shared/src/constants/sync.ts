export const SYNC_BATCH_MAX_SIZE = 100;
export const SYNC_BATCH_FLUSH_INTERVAL_MS = 200;

// How long to retain idempotency keys before pruning
export const IDEMPOTENCY_KEY_TTL_DAYS = 7;

// Offline queue configuration for mobile client
export const OFFLINE_QUEUE_MAX_SIZE = 10000;
export const OFFLINE_QUEUE_STORAGE_KEY = '@taskbunny/offline_queue';
export const OFFLINE_QUEUE_FLUSH_BATCH_SIZE = 100;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

export const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
export const LOGIN_WINDOW_MS = 60_000;
export const LOGIN_MAX_ATTEMPTS = 10;
export const NOTIFICATION_POLL_MS = 30_000;
export const TOAST_DURATION_MS = 3000;

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

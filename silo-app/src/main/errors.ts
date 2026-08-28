export type SiloErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'PERSISTENCE_FAILED'
  | 'STORAGE_READ_FAILED'
  | 'MIGRATION_FAILED'
  | 'BROWSER_FAILED'
  | 'SECURITY_BLOCKED'
  | 'INTERNAL_ERROR'

export class SiloError extends Error {
  readonly code: SiloErrorCode
  readonly cause?: unknown

  constructor(code: SiloErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'SiloError'
    this.code = code
    this.cause = cause
  }
}

function redactSecrets(value: string): string {
  return value
    .replace(/([a-z][a-z\d+.-]*:\/\/)[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(/((?:password|username|proxyPassword|proxyUsername|proxy-password|proxy-username|secret)\s*[=:]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]')
}

function safeLogValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSecrets(value.message),
      stack: value.stack ? redactSecrets(value.stack) : undefined
    }
  }
  return redactSecrets(String(value))
}

export function logInternalError(message: string, cause: unknown): void {
  console.error(message, safeLogValue(cause))
}

export function persistenceError(resource: string, cause: unknown): SiloError {
  logInternalError(`Failed to persist ${resource}:`, cause)
  return new SiloError('PERSISTENCE_FAILED', `Could not save ${resource}. Your change was not saved.`, cause)
}

export function storageReadError(resource: string, cause: unknown): SiloError {
  logInternalError(`Failed to read ${resource}:`, cause)
  return new SiloError('STORAGE_READ_FAILED', `Could not read ${resource}. The existing data was left untouched.`, cause)
}

export function migrationError(cause: unknown): SiloError {
  logInternalError('Silo database migration failed:', cause)
  return new SiloError('MIGRATION_FAILED', 'Silo could not safely migrate its database. No data was changed.', cause)
}

export function toSafeError(error: unknown, fallback = 'The requested operation could not be completed.'): SiloError {
  if (error instanceof SiloError) return error
  logInternalError('Silo operation failed:', error)
  return new SiloError('INTERNAL_ERROR', fallback, error)
}

export function registerSafeIpcHandler(
  ipcMain: Electron.IpcMain,
  channel: string,
  handler: (...args: never[]) => unknown,
  fallback: string
): void {
  ipcMain.handle(channel, async (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await (handler as (...values: unknown[]) => unknown)(event, ...args)
    } catch (error) {
      throw toSafeError(error, fallback)
    }
  })
}

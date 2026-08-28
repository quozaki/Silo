import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'fs'
import { dirname } from 'path'

export interface AtomicWriteOptions {
  backupPath?: string
  preserveBackup?: boolean
}

/**
 * Write a complete file beside its target, flush it, then replace the target.
 * The backup is made before replacement and is never used as an active path.
 */
export function atomicWriteFile(filePath: string, contents: string | Uint8Array, options: AtomicWriteOptions = {}): void {
  const directory = dirname(filePath)
  mkdirSync(directory, { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  let descriptor: number | undefined
  try {
    descriptor = openSync(tempPath, 'wx')
    const buffer = typeof contents === 'string' ? Buffer.from(contents, 'utf8') : Buffer.from(contents)
    let offset = 0
    while (offset < buffer.length) offset += writeSync(descriptor, buffer, offset, buffer.length - offset)
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined

    // During normal writes, retain the immediately previous valid version. A
    // recovery write explicitly preserves the known-good backup instead of
    // copying a corrupt primary over it.
    if (options.backupPath && existsSync(filePath) && !options.preserveBackup) {
      copyFileSync(filePath, options.backupPath)
    }
    renameSync(tempPath, filePath)
    if (options.backupPath && !options.preserveBackup) copyFileSync(filePath, options.backupPath)
  } finally {
    if (descriptor !== undefined) closeSync(descriptor)
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath)
      } catch {
        // Cleanup is best effort; the original error is more useful to callers.
      }
    }
  }
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

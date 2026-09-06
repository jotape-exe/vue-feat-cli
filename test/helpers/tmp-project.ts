import fs from 'fs-extra'
import os from 'os'
import path from 'path'

export interface TmpProject {
  root: string
  cleanup: () => Promise<void>
}

/**
 * Creates an isolated temp directory and chdirs into it, since every
 * command under test reads `process.cwd()` directly instead of accepting
 * a root param. Restores the original cwd on cleanup.
 */
export async function createTmpProject(): Promise<TmpProject> {
  const originalCwd = process.cwd()
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-cli-test-'))
  process.chdir(root)

  return {
    root,
    cleanup: async () => {
      process.chdir(originalCwd)
      await fs.remove(root)
    },
  }
}

/** Thrown by the mocked `process.exit` so command flow stops like it would for real. */
export class ProcessExitError extends Error {
  constructor(public code: number | undefined) {
    super(`process.exit(${code ?? 0}) called`)
  }
}

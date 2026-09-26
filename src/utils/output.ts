export type FileStatus = 'created' | 'overwritten' | 'skipped' | 'dry-run' | 'exists'

export interface FilePlan {
  template: string
  path: string
  status: FileStatus
  reason?: string
}

export interface MachineResult {
  command: string
  ok: boolean
  dryRun: boolean
  files: FilePlan[]
  warnings: string[]
  [key: string]: unknown
}

export function emitJson(result: MachineResult): void {
  console.log(JSON.stringify(result, null, 2))
}

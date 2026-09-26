import { log } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import type { VfConfig } from '../config'
import { renderTemplate } from './render'

export async function ensureHttpClient(
  root: string,
  config: VfConfig,
  opts: { dryRun?: boolean; silent?: boolean; overwrite?: boolean } = {},
): Promise<{ path: string; status: 'created' | 'overwritten' | 'skipped' | 'dry-run' }> {
  const outputPath = path.join(root, config.sharedDir, 'http', 'client.ts')

  const template =
    config.httpClient === 'axios'
      ? 'shared/http-client-axios.ts.hbs'
      : 'shared/http-client-fetch.ts.hbs'

  const exists = await fs.pathExists(outputPath)
  if (exists && !opts.overwrite) {
    if (!opts.silent && !opts.dryRun) log.info(`HTTP client already exists at: ${path.relative(root, outputPath)} (skipped)`)
    return { path: outputPath, status: exists && opts.dryRun ? 'dry-run' : 'skipped' }
  }

  if (opts.dryRun) {
    return { path: outputPath, status: exists ? 'skipped' : 'dry-run' }
  }

  const created = await renderTemplate({
    template,
    outputPath,
    context: {},
    skipIfExists: !opts.overwrite,
    overwrite: opts.overwrite,
  })

  if (!opts.silent) {
    if (created) log.success(`Created: ${path.relative(root, created)}`)
    else log.info(`HTTP client already exists at: ${path.relative(root, outputPath)} (skipped)`)
  }

  await ensureEnvExample(root, opts.silent)
  return { path: outputPath, status: exists ? 'overwritten' : 'created' }
}

async function ensureEnvExample(root: string, silent?: boolean) {
  const envPath = path.join(root, '.env.example')
  if (await fs.pathExists(envPath)) return

  await fs.writeFile(envPath, 'VITE_API_BASE_URL=http://localhost:3333\n', 'utf-8')
  if (!silent) log.success(`Created: ${path.relative(root, envPath)}`)
}
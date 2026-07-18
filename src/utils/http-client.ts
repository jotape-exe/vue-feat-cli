import { log } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import type { VfConfig } from '../config'
import { renderTemplate } from './render'

export async function ensureHttpClient(root: string, config: VfConfig) {
  const outputPath = path.join(root, config.sharedDir, 'http', 'client.ts')

  const template =
    config.httpClient === 'axios'
      ? 'shared/http-client-axios.ts.hbs'
      : 'shared/http-client-fetch.ts.hbs'

  const created = await renderTemplate({
    template,
    outputPath,
    context: {},
    skipIfExists: true,
  })

  if (created) {
    log.success(`Created: ${path.relative(root, created)}`)
  } else {
    log.info(`HTTP client already exists at: ${path.relative(root, outputPath)} (skipped)`)
  }

  await ensureEnvExample(root)
}

async function ensureEnvExample(root: string) {
  const envPath = path.join(root, '.env.example')
  if (await fs.pathExists(envPath)) return

  await fs.writeFile(envPath, 'VITE_API_BASE_URL=http://localhost:3333\n', 'utf-8')
  log.success(`Created: ${path.relative(root, envPath)}`)
}
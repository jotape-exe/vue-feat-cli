import { cancel, confirm, intro, isCancel, log, outro, select, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { CONFIG_FILENAME, defaultConfig, saveConfig, type VfConfig } from '../config'
import { ensureHttpClient } from '../utils/http-client'
import { hasDependency } from '../utils/package'

async function detectAlias(root: string): Promise<string | null> {
  const tsconfigPath = path.join(root, 'tsconfig.json')
  if (!(await fs.pathExists(tsconfigPath))) return null

  try {
    const tsconfig = await fs.readJson(tsconfigPath)
    const paths = tsconfig.compilerOptions?.paths ?? {}
    for (const key of Object.keys(paths)) {
      const match = key.match(/^(.+)\/\*$/)
      if (match) return match[1]
    }
  } catch {
    return null
  }
  return null
}

function exitIfCancelled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return value
}

interface InitOptions {
  yes?: boolean
}

export async function init(options: InitOptions = {}) {
  const { yes = false } = options

  intro('⚙️  Configuring vue-feat-cli')

  const root = process.cwd()
  const configPath = path.join(root, CONFIG_FILENAME)

  if (await fs.pathExists(configPath)) {
    if (!yes) {
      const overwrite = exitIfCancelled(
        await confirm({
          message: `${CONFIG_FILENAME} already exists. Overwrite?`,
          initialValue: false,
        }),
      )
      if (!overwrite) {
        cancel('Operation cancelled.')
        process.exit(0)
      }
    } else {
      log.info(`${CONFIG_FILENAME} already exists — overwriting (--yes).`)
    }
  }

  log.step('Detecting project dependencies...')

  const hasPinia = await hasDependency(root, 'pinia')
  const hasVueRouter = await hasDependency(root, 'vue-router')
  const hasTanstackQuery = await hasDependency(root, '@tanstack/vue-query')
  const hasAxios = await hasDependency(root, 'axios')
  const detectedAlias = await detectAlias(root)

  log.info(`Pinia: ${hasPinia ? '✅ found' : '❌ not found'}`)
  log.info(`Vue Router: ${hasVueRouter ? '✅ found' : '❌ not found'}`)
  log.info(`TanStack Query: ${hasTanstackQuery ? '✅ found' : '❌ not found'}`)
  log.info(`Axios: ${hasAxios ? '✅ found' : '❌ not found (will use fetch)'}`)
  log.info(`Detected alias: ${detectedAlias ?? 'none (defaulting to "@")'}`)

  const usesPinia = yes
    ? hasPinia
    : exitIfCancelled(
        await confirm({ message: 'Use Pinia for feature stores?', initialValue: hasPinia }),
      )

  const usesVueRouter = yes
    ? hasVueRouter
    : exitIfCancelled(
        await confirm({ message: 'Does this project use Vue Router?', initialValue: hasVueRouter }),
      )

  const usesTanstackQuery = yes
    ? hasTanstackQuery
    : exitIfCancelled(
        await confirm({
          message: 'Use TanStack Query for data composables?',
          initialValue: hasTanstackQuery,
        }),
      )

  const httpClient = yes
    ? (hasAxios ? 'axios' : 'fetch')
    : exitIfCancelled(
        await select({
          message: 'Which HTTP client should services use?',
          options: [
            { value: 'fetch', label: 'fetch (native)' },
            { value: 'axios', label: 'axios' },
          ],
          initialValue: hasAxios ? 'axios' : 'fetch',
        }),
      )

  const alias = yes
    ? (detectedAlias ?? '@')
    : exitIfCancelled(
        await text({
          message: 'Import alias for absolute paths (e.g. "@")',
          placeholder: '@',
          defaultValue: detectedAlias ?? '@',
          initialValue: detectedAlias ?? '@',
        }),
      )

  const useCustomTemplates = yes
    ? false
    : exitIfCancelled(
        await confirm({
          message: 'Use custom templates? (creates .vf/templates/ for overrides)',
          initialValue: false,
        }),
      )

  const config: VfConfig = {
    ...defaultConfig,
    usesPinia,
    usesVueRouter,
    usesTanstackQuery,
    httpClient: httpClient as 'fetch' | 'axios',
    alias: alias.trim() || '@',
    ...(useCustomTemplates ? { templatesDir: '.vf/templates' } : {}),
  }

  await saveConfig(root, config)

  if (useCustomTemplates) {
    await fs.ensureDir(path.join(root, '.vf', 'templates'))
    log.info('Created .vf/templates/ — add .hbs files here to override defaults. Run "vf templates:init" to copy all defaults.')
  }
  log.success(`Configuration saved to ${CONFIG_FILENAME}`)

  await fs.ensureDir(path.join(root, config.sharedDir, 'components'))
  await fs.ensureDir(path.join(root, config.sharedDir, 'composables'))
  await fs.ensureDir(path.join(root, config.sharedDir, 'utils'))
  await fs.ensureDir(path.join(root, config.sharedDir, 'http'))
  await fs.ensureDir(path.join(root, config.featuresDir))

  await ensureHttpClient(root, config)

  outro('Done! Run "vf generate:feat <name>" to scaffold your first feature.')
}
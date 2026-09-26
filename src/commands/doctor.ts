import fs from 'fs-extra'
import path from 'path'
import { CONFIG_FILENAME, defaultConfig, loadConfig } from '../config'
import { FEAT_LAYERS } from '../utils/feat-layers'
import { emitJson } from '../utils/output'
import { hasDependency } from '../utils/package'
import { TEMPLATES_DIR } from '../utils/render'

interface DoctorOptions {
  json?: boolean
}

interface Check {
  id: string
  label: string
  ok: boolean
  detail: string
  hint?: string | undefined
}

export async function doctor(options: DoctorOptions = {}) {
  const jsonMode = Boolean(options.json)
  const root = process.cwd()
  const configPath = path.join(root, CONFIG_FILENAME)
  const hasConfig = await fs.pathExists(configPath)
  const config = await loadConfig(root)

  const checks: Check[] = []
  const warnings: string[] = []

  checks.push({
    id: 'config',
    label: 'vf.config.json exists',
    ok: hasConfig,
    detail: hasConfig ? configPath : `${CONFIG_FILENAME} not found — using defaults (${JSON.stringify(defaultConfig)})`,
    hint: hasConfig ? undefined : 'Run "vf init" to create it.',
  })

  for (const [id, dir] of [
    ['srcDir', config.srcDir],
    ['featuresDir', config.featuresDir],
    ['sharedDir', config.sharedDir],
  ] as const) {
    const p = path.join(root, dir)
    const ok = await fs.pathExists(p)
    checks.push({ id: `dir:${id}`, label: `dir ${dir} exists`, ok, detail: p, hint: ok ? undefined : `Run "vf init" to create it.` })
  }

  // Alias check against tsconfig paths
  const tsconfigPath = path.join(root, 'tsconfig.json')
  if (await fs.pathExists(tsconfigPath)) {
    try {
      const tsconfig = await fs.readJson(tsconfigPath)
      const paths = tsconfig.compilerOptions?.paths ?? {}
      const aliases = Object.keys(paths).map((k) => k.replace(/\/\*$/, ''))
      const ok = aliases.includes(config.alias)
      checks.push({
        id: 'alias',
        label: `alias "${config.alias}" mapped in tsconfig`,
        ok,
        detail: aliases.length ? `paths: ${aliases.join(', ')}` : 'no compilerOptions.paths found',
        hint: ok ? undefined : `Add { "${config.alias}/*": ["./${config.srcDir}/*"] } to tsconfig.json.`,
      })
    } catch {
      checks.push({ id: 'alias', label: 'tsconfig readable', ok: false, detail: tsconfigPath })
    }
  } else {
    checks.push({ id: 'alias', label: 'tsconfig exists', ok: false, detail: 'tsconfig.json not found', hint: 'Alias check skipped.' })
  }

  const depExpectations: { dep: string; enabled: boolean; label: string }[] = [
    { dep: 'pinia', enabled: config.usesPinia, label: 'Pinia' },
    { dep: 'vue-router', enabled: config.usesVueRouter, label: 'Vue Router' },
    { dep: '@tanstack/vue-query', enabled: config.usesTanstackQuery, label: 'TanStack Query' },
    { dep: 'axios', enabled: config.httpClient === 'axios', label: 'axios (httpClient)' },
  ]
  for (const { dep, enabled, label } of depExpectations) {
    const installed = await hasDependency(root, dep)
    const ok = !enabled || installed
    checks.push({
      id: `dep:${dep}`,
      label: `${label} ${enabled ? 'enabled + installed' : installed ? 'installed (not enabled)' : 'not used'}`,
      ok,
      detail: `config=${enabled ? 'on' : 'off'}, installed=${installed ? 'yes' : 'no'}`,
      hint: ok ? undefined : `Install "${dep}" or disable it in ${CONFIG_FILENAME}.`,
    })
  }

  const httpPath = path.join(root, config.sharedDir, 'http', 'client.ts')
  const httpExists = await fs.pathExists(httpPath)
  checks.push({ id: 'http-client', label: 'shared http client exists', ok: httpExists, detail: httpPath, hint: httpExists ? undefined : 'Run "vf init" or generate any feature to create it.' })

  if (config.usesVueRouter) {
    const routerPath = path.join(root, config.srcDir, 'router', 'index.ts')
    const ok = await fs.pathExists(routerPath)
    checks.push({ id: 'router', label: 'router file exists', ok, detail: routerPath, hint: ok ? undefined : '--register-route needs this file.' })
  }

  if (config.templatesDir) {
    const tplPath = path.resolve(root, config.templatesDir)
    const ok = await fs.pathExists(tplPath)
    checks.push({ id: 'templatesDir', label: `templatesDir ${config.templatesDir} exists`, ok, detail: tplPath, hint: ok ? undefined : 'Run "vf templates:init".' })
  }

  // Built-in templates inventory (machine-readable for agents)
  const builtin: string[] = []
  try {
    const walk = async (dir: string, prefix = ''): Promise<void> => {
      for (const entry of await fs.readdir(dir)) {
        const full = path.join(dir, entry)
        const stat = await fs.stat(full)
        if (stat.isDirectory()) await walk(full, `${prefix}${entry}/`)
        else builtin.push(`${prefix}${entry}`)
      }
    }
    await walk(TEMPLATES_DIR)
  } catch {
    warnings.push('Could not list built-in templates.')
  }

  const ok = checks.every((c) => c.ok)
  const result = {
    command: 'doctor',
    ok,
    dryRun: false,
    files: [],
    warnings,
    config,
    configPath: hasConfig ? configPath : null,
    layers: FEAT_LAYERS,
    checks,
    templates: builtin.sort(),
    templateVariables: {
      feature: ['name', 'Name', 'nameCamel', 'alias', 'usesVueRouter'],
      component: ['name', 'Name'],
      composable: ['name', 'Name'],
    },
  }

  if (jsonMode) {
    emitJson(result)
    return result
  }

  console.log()
  console.log(`  vf doctor — ${ok ? 'all checks passed' : 'issues found'}`)
  console.log()
  for (const c of checks) {
    console.log(`  ${c.ok ? '✅' : '❌'} ${c.label}`)
    console.log(`     ${c.detail}`)
    if (c.hint) console.log(`     → ${c.hint}`)
  }
  console.log()
  return result
}

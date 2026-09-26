import { intro, log, outro } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { resolveFeatLayers, type FeatLayerOptions } from '../utils/feat-layers'
import { ensureHttpClient } from '../utils/http-client'
import { emitJson, type FilePlan } from '../utils/output'
import { hasDependency } from '../utils/package'
import { renderTemplate } from '../utils/render'
import { registerRouteInRouter } from '../utils/router'

export interface GenerateFeatOptions extends FeatLayerOptions {
  withCrud?: boolean
  registerRoute?: boolean
  dryRun?: boolean
  json?: boolean
  force?: boolean
}

export async function generateFeat(name: string, options: GenerateFeatOptions = {}) {
  const jsonMode = Boolean(options.json)
  const dryRun = Boolean(options.dryRun)
  const force = Boolean(options.force)

  if (!jsonMode) intro(`${dryRun ? '🔍 [dry-run] ' : '🚀 '}Scaffolding feature: ${name}`)

  const root = process.cwd()
  const config = await loadConfig(root)
  const warnings: string[] = []

  const featureName = kebabCase(name)
  const PascalName = pascalCase(name)
  const base = path.join(root, config.featuresDir, featureName)

  const context = {
    name: featureName,
    Name: PascalName,
    nameCamel: camelCase(name),
    alias: config.alias,
    usesVueRouter: config.usesVueRouter,
  }

  if (config.usesPinia && !(await hasDependency(root, 'pinia'))) {
    const msg = '"pinia" not found in package.json — run "npm install pinia" and set up createPinia() in main.ts before using the store.'
    if (jsonMode) warnings.push(msg)
    else log.warn(msg)
  }

  let enabled: Set<string>
  try {
    const resolved = resolveFeatLayers(config, options)
    enabled = resolved.enabled
    warnings.push(...resolved.warnings)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (jsonMode) {
      emitJson({ command: 'generate:feat', ok: false, dryRun, feature: featureName, files: [], warnings, error: message })
      process.exit(1)
    }
    throw err
  }

  if (enabled.size === 0) {
    const msg = 'No layers selected — nothing to generate. Check --only/--exclude/--no-* flags.'
    if (jsonMode) {
      emitJson({ command: 'generate:feat', ok: false, dryRun, feature: featureName, files: [], warnings, error: msg })
      process.exit(1)
    }
    throw new Error(msg)
  }

  const storeTemplate = config.usesPinia ? 'feature/store.ts.hbs' : 'feature/store-composable.ts.hbs'
  const serviceTemplate = options.withCrud ? 'feature/service-crud.ts.hbs' : 'feature/service.ts.hbs'
  const serviceComposableTemplate = options.withCrud
    ? 'feature/service-composable-crud.ts.hbs'
    : 'feature/service-composable.ts.hbs'
  const pageComposableTemplate = options.withCrud
    ? 'feature/page-composable-crud.ts.hbs'
    : 'feature/page-composable.ts.hbs'
  const typesTemplate = options.withCrud ? 'feature/types-crud.ts.hbs' : 'feature/types.ts.hbs'

  const candidates: { layer: string; template: string; out: string }[] = []
  if (enabled.has('service')) candidates.push({ layer: 'service', template: serviceTemplate, out: path.join(base, 'services', `${featureName}.service.ts`) })
  if (enabled.has('serviceComposable')) candidates.push({ layer: 'serviceComposable', template: serviceComposableTemplate, out: path.join(base, 'composables', `use${PascalName}Service.ts`) })
  if (enabled.has('pageComposable')) candidates.push({ layer: 'pageComposable', template: pageComposableTemplate, out: path.join(base, 'composables', `use${PascalName}Page.ts`) })
  if (enabled.has('store')) candidates.push({ layer: 'store', template: storeTemplate, out: path.join(base, 'stores', `${featureName}.store.ts`) })
  if (enabled.has('types')) candidates.push({ layer: 'types', template: typesTemplate, out: path.join(base, 'types', `${featureName}.types.ts`) })
  if (enabled.has('index')) candidates.push({ layer: 'index', template: 'feature/index.ts.hbs', out: path.join(base, 'index.ts') })
  if (enabled.has('routes') && config.usesVueRouter) candidates.push({ layer: 'routes', template: 'feature/routes.ts.hbs', out: path.join(base, 'routes.ts') })
  if (enabled.has('view') && config.usesVueRouter) candidates.push({ layer: 'view', template: 'feature/View.vue.hbs', out: path.join(base, 'views', `${PascalName}View.vue`) })

  const files: FilePlan[] = []
  let failed = false

  for (const file of candidates) {
    const rel = path.relative(root, file.out)
    if (dryRun) {
      const exists = await fs.pathExists(file.out)
      files.push({ template: file.template, path: rel, status: 'dry-run', reason: exists ? (force ? 'would overwrite' : 'already exists') : 'would create' })
      continue
    }
    try {
      const existed = await fs.pathExists(file.out)
      await renderTemplate({
        template: file.template,
        outputPath: file.out,
        context,
        templatesDir: config.templatesDir,
        root,
        overwrite: force,
      })
      files.push({ template: file.template, path: rel, status: existed && force ? 'overwritten' : 'created' })
      if (!jsonMode) log.success(`${existed && force ? 'Overwrote' : 'Created'}: ${rel}`)
    } catch (err) {
      failed = true
      const message = err instanceof Error ? err.message : String(err)
      files.push({ template: file.template, path: rel, status: 'exists', reason: message })
      if (!jsonMode) log.error(message)
    }
  }

  if (!dryRun) {
    await fs.ensureDir(path.join(base, 'components'))
    if (!config.usesVueRouter) await fs.ensureDir(path.join(base, 'views'))
    // Shared http client is idempotent: never overwrite it as a side effect of
    // --force (which targets feature files). It is only created when missing.
    const http = await ensureHttpClient(root, config, { dryRun, silent: jsonMode })
    if (http.status !== 'skipped') {
      files.push({ template: config.httpClient === 'axios' ? 'shared/http-client-axios.ts.hbs' : 'shared/http-client-fetch.ts.hbs', path: path.relative(root, http.path), status: http.status })
    }
  } else {
    const httpPath = path.join(root, config.sharedDir, 'http', 'client.ts')
    if (!(await fs.pathExists(httpPath))) {
      files.push({ template: 'shared/http-client-*.ts.hbs', path: path.relative(root, httpPath), status: 'dry-run', reason: 'would create' })
    }
  }

  let routeRegistered = false
  let routeReason: string | undefined
  if (options.registerRoute) {
    if (!config.usesVueRouter) {
      const msg = '--register-route requires "usesVueRouter: true" in vf.config.json (skipped).'
      if (jsonMode) warnings.push(msg)
      else log.warn(msg)
      routeReason = msg
    } else if (dryRun) {
      routeReason = 'dry-run: route would be registered'
    } else {
      const res = await registerRouteInRouter(root, config, featureName, context.nameCamel, { silent: jsonMode })
      routeRegistered = res.registered
      routeReason = res.reason
    }
  }

  for (const w of warnings) {
    if (!jsonMode) log.warn(w)
  }

  const result = {
    command: 'generate:feat',
    ok: !failed,
    dryRun,
    feature: featureName,
    baseDir: path.relative(root, base),
    layers: [...enabled],
    files,
    warnings,
    routeRegistered,
    ...(routeReason ? { routeReason } : {}),
  }

  if (jsonMode) {
    emitJson(result)
    if (failed) process.exit(1)
    return result
  }

  if (failed) throw new Error('Some files already exist (use --force to overwrite).')
  outro(`Feature "${featureName}" created at ${path.relative(root, base)}`)
  return result
}

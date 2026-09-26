import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { emitJson, type FilePlan } from '../utils/output'
import { hasDependency } from '../utils/package'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
  dryRun?: boolean
  json?: boolean
  force?: boolean
}

export async function generateStore(name: string, options: Options) {
  const jsonMode = Boolean(options.json)
  const dryRun = Boolean(options.dryRun)
  const force = Boolean(options.force)

  if (!jsonMode) intro(`${dryRun ? '🔍 [dry-run] ' : '🗃️  '}Generating store: ${kebabCase(name)}.store.ts`)

  const root = process.cwd()
  const config = await loadConfig(root)

  let feature = options.feature
  if (!feature) {
    if (jsonMode) {
      const msg = 'Missing --feature. Usage: vf g:store <name> --feature <feature> [--json]'
      emitJson({ command: 'generate:store', ok: false, dryRun, files: [], warnings: [], error: msg })
      process.exit(1)
    }
    const answer = await text({ message: 'Which feature does this store belong to?', placeholder: 'e.g. acme' })
    if (isCancel(answer)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }
    feature = answer as string
  }

  feature = kebabCase(feature)
  const featurePath = path.join(root, config.featuresDir, feature)
  if (!(await fs.pathExists(featurePath))) {
    const msg = `Feature "${feature}" not found. Run "vf generate:feat ${feature}" first.`
    if (jsonMode) {
      emitJson({ command: 'generate:store', ok: false, dryRun, files: [], warnings: [], error: msg })
      process.exit(1)
    }
    log.error(msg)
    process.exit(1)
  }

  const resourceName = kebabCase(name)
  const context = { name: resourceName, Name: pascalCase(name), nameCamel: camelCase(name) }
  const warnings: string[] = []

  const storeTemplate = config.usesPinia ? 'feature/store.ts.hbs' : 'feature/store-composable.ts.hbs'
  if (!config.usesPinia) warnings.push('Pinia not enabled in vf.config.json. Generating store with reactive() fallback.')
  else if (!(await hasDependency(root, 'pinia'))) warnings.push('"pinia" not found in package.json — run "npm install pinia" and set up createPinia() in main.ts.')

  const typesPath = path.join(featurePath, 'types', `${resourceName}.types.ts`)
  const storePath = path.join(featurePath, 'stores', `${resourceName}.store.ts`)
  const files: FilePlan[] = []

  if (dryRun) {
    for (const [template, out] of [
      ['feature/types.ts.hbs', typesPath],
      [storeTemplate, storePath],
    ] as const) {
      const exists = await fs.pathExists(out)
      files.push({
        template,
        path: path.relative(root, out),
        status: 'dry-run',
        reason: template.startsWith('feature/types') && exists ? 'would skip (already exists)' : exists ? (force ? 'would overwrite' : 'already exists') : 'would create',
      })
    }
    const result = { command: 'generate:store', ok: true, dryRun: true, files, warnings }
    if (jsonMode) emitJson(result)
    else {
      for (const w of warnings) log.warn(w)
      for (const f of files) log.info(`[dry-run] ${f.path} — ${f.reason}`)
    }
    return result
  }

  for (const w of warnings) if (!jsonMode) log.warn(w)

  const typesCreated = await renderTemplate({
    template: 'feature/types.ts.hbs',
    outputPath: typesPath,
    context,
    skipIfExists: true,
    templatesDir: config.templatesDir,
    root,
  })
  if (typesCreated) {
    files.push({ template: 'feature/types.ts.hbs', path: path.relative(root, typesCreated), status: 'created' })
    if (!jsonMode) log.success(`Created: ${path.relative(root, typesCreated)}`)
  } else {
    files.push({ template: 'feature/types.ts.hbs', path: path.relative(root, typesPath), status: 'skipped', reason: 'already exists' })
    if (!jsonMode) log.info(`Types already exist at: ${path.relative(root, typesPath)} (skipped)`)
  }

  try {
    const existed = await fs.pathExists(storePath)
    await renderTemplate({ template: storeTemplate, outputPath: storePath, context, templatesDir: config.templatesDir, root, overwrite: force })
    files.push({ template: storeTemplate, path: path.relative(root, storePath), status: existed && force ? 'overwritten' : 'created' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (jsonMode) {
      emitJson({ command: 'generate:store', ok: false, dryRun, files, warnings, error: message })
      process.exit(1)
    }
    throw err
  }

  const result = { command: 'generate:store', ok: true, dryRun: false, files, warnings }
  if (jsonMode) emitJson(result)
  else outro(`Created: ${path.relative(root, storePath)}`)
  return result
}

import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { kebabCase, pascalCase } from '../utils/case'
import { emitJson, type MachineResult } from '../utils/output'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
  dryRun?: boolean
  json?: boolean
  force?: boolean
}

export async function generateComponent(name: string, options: Options) {
  const jsonMode = Boolean(options.json)
  const dryRun = Boolean(options.dryRun)
  const force = Boolean(options.force)

  const segments = name.split('/').filter(Boolean)
  const componentName = segments.pop()!
  const subPath = segments.join(path.sep)
  const Name = pascalCase(componentName)

  if (!jsonMode) intro(`${dryRun ? '🔍 [dry-run] ' : '🧱 '}Generating component: ${Name}.vue`)

  const root = process.cwd()
  const config = await loadConfig(root)
  let feature = options.feature

  if (feature === undefined) {
    if (jsonMode) {
      feature = ''
    } else {
      const answer = await text({
        message: 'Which feature does this component belong to? (leave empty for shared)',
        placeholder: 'e.g. acme',
        defaultValue: '',
      })
      if (isCancel(answer)) {
        cancel('Operation cancelled.')
        process.exit(0)
      }
      feature = (answer as string).trim()
    }
  }

  let basePath: string
  if (feature) {
    feature = kebabCase(feature)
    const featurePath = path.join(root, config.featuresDir, feature)
    if (!(await fs.pathExists(featurePath))) {
      const msg = `Feature "${feature}" not found. Run "vf generate:feat ${feature}" first.`
      if (jsonMode) {
        emitJson({ command: 'generate:component', ok: false, dryRun, files: [], warnings: [], error: msg })
        process.exit(1)
      }
      log.error(msg)
      process.exit(1)
    }
    basePath = path.join(featurePath, 'components', subPath)
  } else {
    basePath = path.join(root, config.sharedDir, 'components', subPath)
  }

  const context = { name: kebabCase(componentName), Name }
  const outputPath = path.join(basePath, `${Name}.vue`)
  const rel = path.relative(root, outputPath)

  if (dryRun) {
    const exists = await fs.pathExists(outputPath)
    const result: MachineResult = {
      command: 'generate:component',
      ok: true,
      dryRun: true,
      files: [{ template: 'component/Component.vue.hbs', path: rel, status: 'dry-run', reason: exists ? (force ? 'would overwrite' : 'already exists') : 'would create' }],
      warnings: [],
    }
    if (jsonMode) emitJson(result)
    else log.info(`[dry-run] Would create: ${rel}`)
    return result
  }

  try {
    const existed = await fs.pathExists(outputPath)
    await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context,
      templatesDir: config.templatesDir,
      root,
      overwrite: force,
    })
    const result: MachineResult = {
      command: 'generate:component',
      ok: true,
      dryRun: false,
      files: [{ template: 'component/Component.vue.hbs', path: rel, status: existed && force ? 'overwritten' : 'created' }],
      warnings: [],
    }
    if (jsonMode) emitJson(result)
    else outro(`Created: ${rel}`)
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (jsonMode) {
      emitJson({ command: 'generate:component', ok: false, dryRun, files: [{ template: 'component/Component.vue.hbs', path: rel, status: 'exists', reason: message }], warnings: [], error: message })
      process.exit(1)
    }
    throw err
  }
}

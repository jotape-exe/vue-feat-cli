import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { hasDependency } from '../utils/package'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
}

export async function generateStore(name: string, options: Options) {
  intro(`🗃️  Generating store: ${kebabCase(name)}.store.ts`)

  const root = process.cwd()
  const config = await loadConfig(root)

  let feature = options.feature

  if (!feature) {
    const answer = await text({
      message: 'Which feature does this store belong to?',
      placeholder: 'e.g. acme',
    })
    if (isCancel(answer)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }
    feature = answer as string
  }

  feature = kebabCase(feature)
  const featurePath = path.join(root, config.featuresDir, feature)

  if (!(await fs.pathExists(featurePath))) {
    log.error(`Feature "${feature}" not found. Run "vf generate:feat ${feature}" first.`)
    process.exit(1)
  }

  const resourceName = kebabCase(name)
  const context = {
    name: resourceName,
    Name: pascalCase(name),
    nameCamel: camelCase(name),
  }

  const typesPath = path.join(featurePath, 'types', `${resourceName}.types.ts`)
  const typesCreated = await renderTemplate({
    template: 'feature/types.ts.hbs',
    outputPath: typesPath,
    context,
    skipIfExists: true,
  })

  if (typesCreated) {
    log.success(`Created: ${path.relative(root, typesCreated)}`)
  } else {
    log.info(`Types already exist at: ${path.relative(root, typesPath)} (skipped)`)
  }

  const storeTemplate = config.usesPinia
    ? 'feature/store.ts.hbs'
    : 'feature/store-composable.ts.hbs'

  if (!config.usesPinia) {
    log.warn('Pinia not enabled in vf.config.json. Generating store with reactive() fallback.')
  } else if (!(await hasDependency(root, 'pinia'))) {
    log.warn('"pinia" not found in package.json — run "npm install pinia" and set up createPinia() in main.ts.')
  }

  const storePath = path.join(featurePath, 'stores', `${resourceName}.store.ts`)
  const created = await renderTemplate({
    template: storeTemplate,
    outputPath: storePath,
    context,
  })

  outro(`Created: ${path.relative(root, created!)}`)
}
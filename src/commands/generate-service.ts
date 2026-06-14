import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { ensureHttpClient } from '../utils/http-client'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
}

export async function generateService(name: string, options: Options) {
  intro(`🔌 Generating service: ${kebabCase(name)}.service.ts`)

    const root = process.cwd()

  const config = await loadConfig(root)
  await ensureHttpClient(root, config)

  let feature = options.feature

  if (!feature) {
    const answer = await text({
      message: 'Which feature does this service belong to?',
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
    alias: config.alias,
  }

  const typesPath = path.join(featurePath, 'types', `${resourceName}.types.ts`)
  const typesCreated = await renderTemplate({
    template: 'feature/types.ts.hbs',
    outputPath: typesPath,
    context,
    skipIfExists: true,
    templatesDir: config.templatesDir,
    root,
  })

  if (typesCreated) {
    log.success(`Created: ${path.relative(root, typesCreated)}`)
  } else {
    log.info(`Types already exist at: ${path.relative(root, typesPath)} (skipped)`)
  }

  const servicePath = path.join(featurePath, 'services', `${resourceName}.service.ts`)
  const created = await renderTemplate({
    template: 'feature/service.ts.hbs',
    outputPath: servicePath,
    context,
    templatesDir: config.templatesDir,
    root,
  })

  outro(`Created: ${path.relative(root, created!)}`)
}
import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { kebabCase, pascalCase } from '../utils/case'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
}

export async function generateComposable(name: string, options: Options) {
  intro(`🧩 Generating composable: use${pascalCase(name)}`)

  const root = process.cwd()
  const config = await loadConfig(root)
  let feature = options.feature

  if (feature === undefined) {
    const answer = await text({
      message: 'Which feature does this composable belong to? (leave empty for shared)',
      placeholder: 'e.g. acme',
      defaultValue: '',
    })
    if (isCancel(answer)) {
      cancel('Operation cancelled.')
      process.exit(0)
    }
    feature = (answer as string).trim()
  }

  const context = {
    name: kebabCase(name),
    Name: pascalCase(name),
  }

  let basePath: string

  if (feature) {
    feature = kebabCase(feature)
    const featurePath = path.join(root, config.featuresDir, feature)

    if (!(await fs.pathExists(featurePath))) {
      log.error(`Feature "${feature}" not found. Run "vf generate:feat ${feature}" first.`)
      process.exit(1)
    }

    basePath = path.join(featurePath, 'composables')
  } else {
    basePath = path.join(root, config.sharedDir, 'composables')
  }

  const outputPath = path.join(basePath, `use${pascalCase(name)}.ts`)

  const created = await renderTemplate({
    template: 'composable/composable.ts.hbs',
    outputPath,
    context,
    templatesDir: config.templatesDir,
    root,
  })

  outro(`Created: ${path.relative(root, created!)}`)
}
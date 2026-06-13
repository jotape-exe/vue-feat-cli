import { cancel, intro, isCancel, log, outro, text } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { kebabCase, pascalCase } from '../utils/case'
import { renderTemplate } from '../utils/render'

interface Options {
  feature?: string
}

export async function generateComponent(name: string, options: Options) {
  const segments = name.split('/').filter(Boolean)
  const componentName = segments.pop()!
  const subPath = segments.join(path.sep)

  const Name = pascalCase(componentName)

  intro(`🧱 Generating component: ${Name}.vue`)

  const root = process.cwd()
  let feature = options.feature

  if (feature === undefined) {
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

  let basePath: string

  if (feature) {
    feature = kebabCase(feature)
    const featurePath = path.join(root, 'src/features', feature)

    if (!(await fs.pathExists(featurePath))) {
      log.error(`Feature "${feature}" not found. Run "vf generate:feat ${feature}" first.`)
      process.exit(1)
    }

    basePath = path.join(featurePath, 'components', subPath)
  } else {
    basePath = path.join(root, 'src/shared/components', subPath)
  }

  const context = {
    name: kebabCase(componentName),
    Name,
  }

  const outputPath = path.join(basePath, `${Name}.vue`)

  const created = await renderTemplate({
    template: 'component/Component.vue.hbs',
    outputPath,
    context,
  })

  outro(`Created: ${path.relative(root, created!)}`)
}
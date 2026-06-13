import { intro, log, outro } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { ensureHttpClient } from '../utils/http-client'
import { renderTemplate } from '../utils/render'

export async function generateFeat(name: string) {
  intro(`🚀 Scaffolding feature: ${name}`)

  const root = process.cwd()
  const config = await loadConfig(root)

  const featureName = kebabCase(name)
  const base = path.join(root, config.featuresDir, featureName)

  const context = {
    name: featureName,
    Name: pascalCase(name),
    nameCamel: camelCase(name),
    alias: config.alias,
    usesVueRouter: config.usesVueRouter,
  }

  const storeTemplate = config.usesPinia
    ? 'feature/store.ts.hbs'
    : 'feature/store-composable.ts.hbs'

  const PascalName = pascalCase(name)

  const files = [
    { template: 'feature/service.ts.hbs', out: path.join(base, 'services', `${featureName}.service.ts`) },
    { template: 'feature/service-composable.ts.hbs', out: path.join(base, 'composables', `use${PascalName}Service.ts`) },
    { template: 'feature/page-composable.ts.hbs', out: path.join(base, 'composables', `use${PascalName}Page.ts`) },
    { template: storeTemplate, out: path.join(base, 'stores', `${featureName}.store.ts`) },
    { template: 'feature/types.ts.hbs', out: path.join(base, 'types', `${featureName}.types.ts`) },
    { template: 'feature/index.ts.hbs', out: path.join(base, 'index.ts') },
  ]

  if (config.usesVueRouter) {
    files.push(
      { template: 'feature/routes.ts.hbs', out: path.join(base, 'routes.ts') },
      { template: 'feature/View.vue.hbs', out: path.join(base, 'views', `${pascalCase(name)}View.vue`) },
    )
  }

  for (const file of files) {
    const created = await renderTemplate({ ...file, outputPath: file.out, context })
    log.success(`Created: ${path.relative(root, created!)}`)
  }

  await fs.ensureDir(path.join(base, 'components'))
  if (!config.usesVueRouter) {
    await fs.ensureDir(path.join(base, 'views'))
  }

  await ensureHttpClient(root, config)

  outro(`Feature "${featureName}" created at ${path.relative(root, base)}`)
}
import { intro, log, outro } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { camelCase, kebabCase, pascalCase } from '../utils/case'
import { ensureHttpClient } from '../utils/http-client'
import { hasDependency } from '../utils/package'
import { renderTemplate } from '../utils/render'
import { registerRouteInRouter } from '../utils/router'

interface Options {
  withCrud?: boolean
  registerRoute?: boolean
}

export async function generateFeat(name: string, options: Options = {}) {
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

  if (config.usesPinia && !(await hasDependency(root, 'pinia'))) {
    log.warn('"pinia" not found in package.json — run "npm install pinia" and set up createPinia() in main.ts before using the store.')
  }

  const storeTemplate = config.usesPinia
    ? 'feature/store.ts.hbs'
    : 'feature/store-composable.ts.hbs'

  const serviceTemplate = options.withCrud
    ? 'feature/service-crud.ts.hbs'
    : 'feature/service.ts.hbs'

  const serviceComposableTemplate = options.withCrud
    ? 'feature/service-composable-crud.ts.hbs'
    : 'feature/service-composable.ts.hbs'

  const pageComposableTemplate = options.withCrud
    ? 'feature/page-composable-crud.ts.hbs'
    : 'feature/page-composable.ts.hbs'

  const typesTemplate = options.withCrud
    ? 'feature/types-crud.ts.hbs'
    : 'feature/types.ts.hbs'

  const PascalName = pascalCase(name)

  const files = [
    { template: serviceTemplate, out: path.join(base, 'services', `${featureName}.service.ts`) },
    { template: serviceComposableTemplate, out: path.join(base, 'composables', `use${PascalName}Service.ts`) },
    { template: pageComposableTemplate, out: path.join(base, 'composables', `use${PascalName}Page.ts`) },
    { template: storeTemplate, out: path.join(base, 'stores', `${featureName}.store.ts`) },
    { template: typesTemplate, out: path.join(base, 'types', `${featureName}.types.ts`) },
    { template: 'feature/index.ts.hbs', out: path.join(base, 'index.ts') },
  ]

  if (config.usesVueRouter) {
    files.push(
      { template: 'feature/routes.ts.hbs', out: path.join(base, 'routes.ts') },
      { template: 'feature/View.vue.hbs', out: path.join(base, 'views', `${PascalName}View.vue`) },
    )
  }

  for (const file of files) {
    const created = await renderTemplate({ ...file, outputPath: file.out, context, templatesDir: config.templatesDir, root })
    log.success(`Created: ${path.relative(root, created!)}`)
  }

  await fs.ensureDir(path.join(base, 'components'))
  if (!config.usesVueRouter) {
    await fs.ensureDir(path.join(base, 'views'))
  }

  await ensureHttpClient(root, config)

  if (options.registerRoute) {
    if (!config.usesVueRouter) {
      log.warn('--register-route requires "usesVueRouter: true" in vf.config.json (skipped).')
    } else {
      await registerRouteInRouter(root, config, featureName, context.nameCamel)
    }
  }

  outro(`Feature "${featureName}" created at ${path.relative(root, base)}`)
}

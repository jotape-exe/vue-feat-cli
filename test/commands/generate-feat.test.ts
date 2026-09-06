import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME, defaultConfig } from '../../src/config'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { log } = await import('../helpers/clack-mock')
const { generateFeat } = await import('../../src/commands/generate-feat')

describe('generateFeat', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('scaffolds the default feature files without Vue Router', async () => {
    await generateFeat('acme')

    const base = path.join(project.root, 'src', 'features', 'acme')
    for (const rel of [
      path.join('services', 'acme.service.ts'),
      path.join('composables', 'useAcmeService.ts'),
      path.join('composables', 'useAcmePage.ts'),
      path.join('stores', 'acme.store.ts'),
      path.join('types', 'acme.types.ts'),
      'index.ts',
    ]) {
      expect(await fs.pathExists(path.join(base, rel))).toBe(true)
    }

    expect(await fs.pathExists(path.join(base, 'routes.ts'))).toBe(false)
    expect(await fs.pathExists(path.join(base, 'components'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'views'))).toBe(true)
  })

  it('kebab-cases the feature name for the directory and file names', async () => {
    await generateFeat('MyAcme Feature')

    const base = path.join(project.root, 'src', 'features', 'my-acme-feature')
    expect(await fs.pathExists(path.join(base, 'services', 'my-acme-feature.service.ts'))).toBe(
      true,
    )
  })

  it('additionally scaffolds routes.ts and the view when Vue Router is enabled', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesVueRouter: true,
    })

    await generateFeat('acme')

    const base = path.join(project.root, 'src', 'features', 'acme')
    expect(await fs.pathExists(path.join(base, 'routes.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'views', 'AcmeView.vue'))).toBe(true)
    // views/ is not pre-created separately when Vue Router already generates it via routes/View.
    expect(await fs.pathExists(path.join(base, 'components'))).toBe(true)
  })

  it('uses CRUD templates when --with-crud is set', async () => {
    await generateFeat('acme', { withCrud: true })

    const servicePath = path.join(project.root, 'src', 'features', 'acme', 'services', 'acme.service.ts')
    const content = await fs.readFile(servicePath, 'utf-8')
    expect(content).toMatch(/create|update|delete|remove/i)
  })

  it('registers the route when --register-route is set and Vue Router is enabled', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesVueRouter: true,
    })
    const routerPath = path.join(project.root, 'src', 'router', 'index.ts')
    await fs.ensureDir(path.dirname(routerPath))
    await fs.writeFile(
      routerPath,
      [
        `import { createRouter, createWebHistory } from 'vue-router'`,
        ``,
        `const router = createRouter({`,
        `  history: createWebHistory(),`,
        `  routes: [],`,
        `})`,
        ``,
        `export default router`,
        ``,
      ].join('\n'),
      'utf-8',
    )

    await generateFeat('acme', { registerRoute: true })

    const content = await fs.readFile(routerPath, 'utf-8')
    expect(content).toContain('...acmeRoutes,')
  })

  it('warns and skips route registration when --register-route is set without Vue Router', async () => {
    await generateFeat('acme', { registerRoute: true })

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('usesVueRouter'))
  })

  it('warns when Pinia is enabled but not installed', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesPinia: true,
    })

    await generateFeat('acme')

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('not found in package.json'))
  })

  it('creates the shared http client as part of feature scaffolding', async () => {
    await generateFeat('acme')

    expect(
      await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts')),
    ).toBe(true)
    expect(await fs.pathExists(path.join(project.root, '.env.example'))).toBe(true)
  })
})

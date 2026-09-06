import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '../../src/config'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { log } = await import('../helpers/clack-mock')
const { registerRouteInRouter } = await import('../../src/utils/router')

const config = { ...defaultConfig, srcDir: 'src', featuresDir: 'src/features' }

describe('registerRouteInRouter', () => {
  let project: TmpProject
  let routerPath: string

  beforeEach(async () => {
    project = await createTmpProject()
    routerPath = path.join(project.root, 'src', 'router', 'index.ts')
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('warns and does nothing when the router file does not exist', async () => {
    await registerRouteInRouter(project.root, config, 'acme', 'acme')
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Router not found'))
  })

  it('skips when the route is already registered', async () => {
    await fs.ensureDir(path.dirname(routerPath))
    await fs.writeFile(routerPath, `const routes = [...acmeRoutes]\n`, 'utf-8')

    await registerRouteInRouter(project.root, config, 'acme', 'acme')

    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('already registered'))
  })

  it('expands an empty inline routes array and inserts the import', async () => {
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

    await registerRouteInRouter(project.root, config, 'acme', 'acme')

    const content = await fs.readFile(routerPath, 'utf-8')
    expect(content).toContain(`import { acmeRoutes } from '../features/acme/routes'`)
    expect(content).toContain('...acmeRoutes,')
    expect(log.success).toHaveBeenCalledWith(expect.stringContaining('Registered route'))
  })

  it('inserts the spread before the closing bracket of a non-empty routes array', async () => {
    await fs.ensureDir(path.dirname(routerPath))
    await fs.writeFile(
      routerPath,
      [
        `import { createRouter, createWebHistory } from 'vue-router'`,
        `import { homeRoutes } from '../features/home/routes'`,
        ``,
        `const router = createRouter({`,
        `  history: createWebHistory(),`,
        `  routes: [`,
        `    ...homeRoutes,`,
        `  ],`,
        `})`,
        ``,
        `export default router`,
        ``,
      ].join('\n'),
      'utf-8',
    )

    await registerRouteInRouter(project.root, config, 'acme', 'acme')

    const content = await fs.readFile(routerPath, 'utf-8')
    expect(content).toContain(`import { acmeRoutes } from '../features/acme/routes'`)
    expect(content.indexOf('...homeRoutes,')).toBeLessThan(content.indexOf('...acmeRoutes,'))
    // Import should land after the last existing import line, not the first.
    expect(content.indexOf(`import { homeRoutes }`)).toBeLessThan(
      content.indexOf(`import { acmeRoutes }`),
    )
  })

  it('still inserts the import but leaves content untouched when no "routes:" key is found', async () => {
    await fs.ensureDir(path.dirname(routerPath))
    const original = `export default {}\n`
    await fs.writeFile(routerPath, original, 'utf-8')

    await registerRouteInRouter(project.root, config, 'acme', 'acme')

    const content = await fs.readFile(routerPath, 'utf-8')
    expect(content).toContain(`import { acmeRoutes } from '../features/acme/routes'`)
    expect(content).toContain(original.trim())
  })
})

import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '../../src/config'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { log } = await import('../helpers/clack-mock')
const { renderTemplate } = await import('../../src/utils/render')
const { ensureHttpClient } = await import('../../src/utils/http-client')
const { registerRouteInRouter } = await import('../../src/utils/router')
const { emitJson } = await import('../../src/utils/output')

describe('renderTemplate overwrite', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('overwrites an existing file when overwrite is true', async () => {
    const outputPath = path.join(project.root, 'Foo.vue')
    await fs.writeFile(outputPath, '// old', 'utf-8')

    const created = await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { name: 'foo', Name: 'Foo' },
      overwrite: true,
    })

    expect(created).toBe(outputPath)
    expect(await fs.readFile(outputPath, 'utf-8')).toContain('Foo')
  })
})

describe('ensureHttpClient flags', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('creates the fetch client and env example when missing', async () => {
    const result = await ensureHttpClient(project.root, defaultConfig)

    expect(result.status).toBe('created')
    expect(await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts'))).toBe(
      true,
    )
    expect(await fs.pathExists(path.join(project.root, '.env.example'))).toBe(true)
  })

  it('creates the axios client when configured', async () => {
    const result = await ensureHttpClient(project.root, { ...defaultConfig, httpClient: 'axios' })

    expect(result.status).toBe('created')
    const content = await fs.readFile(
      path.join(project.root, 'src', 'shared', 'http', 'client.ts'),
      'utf-8',
    )
    expect(content).toContain('axios')
  })

  it('--dry-run reports without writing anything', async () => {
    const result = await ensureHttpClient(project.root, defaultConfig, { dryRun: true })

    expect(result.status).toBe('dry-run')
    expect(await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts'))).toBe(
      false,
    )
    expect(await fs.pathExists(path.join(project.root, '.env.example'))).toBe(false)
  })

  it('preserves an existing custom client', async () => {
    const clientPath = path.join(project.root, 'src', 'shared', 'http', 'client.ts')
    await fs.ensureDir(path.dirname(clientPath))
    await fs.writeFile(clientPath, '// custom client\n', 'utf-8')

    const result = await ensureHttpClient(project.root, defaultConfig)

    expect(result.status).toBe('skipped')
    expect(await fs.readFile(clientPath, 'utf-8')).toContain('custom client')
  })

  it('silent mode suppresses clack logs', async () => {
    await ensureHttpClient(project.root, defaultConfig, { silent: true })

    expect(log.success).not.toHaveBeenCalled()
    expect(await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts'))).toBe(
      true,
    )
  })
})

describe('registerRouteInRouter result', () => {
  let project: TmpProject
  let routerPath: string
  const config = { ...defaultConfig, srcDir: 'src', featuresDir: 'src/features' }

  beforeEach(async () => {
    project = await createTmpProject()
    routerPath = path.join(project.root, 'src', 'router', 'index.ts')
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('returns registered: true after patching the router', async () => {
    await fs.ensureDir(path.dirname(routerPath))
    await fs.writeFile(routerPath, `const router = { routes: [] }\n`, 'utf-8')

    const result = await registerRouteInRouter(project.root, config, 'acme', 'acme')

    expect(result).toEqual({ registered: true })
  })

  it('returns a reason when the router file is missing', async () => {
    const result = await registerRouteInRouter(project.root, config, 'acme', 'acme')

    expect(result.registered).toBe(false)
    expect(result.reason).toMatch(/Router not found/)
  })

  it('--dry-run does not touch the router file', async () => {
    await fs.ensureDir(path.dirname(routerPath))
    const original = `const router = { routes: [] }\n`
    await fs.writeFile(routerPath, original, 'utf-8')

    const result = await registerRouteInRouter(project.root, config, 'acme', 'acme', {
      dryRun: true,
    })

    expect(result.registered).toBe(false)
    expect(result.reason).toMatch(/dry-run/)
    expect(await fs.readFile(routerPath, 'utf-8')).toBe(original)
  })
})

describe('emitJson', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('prints the result as parseable JSON', () => {
    emitJson({ command: 'test', ok: true, dryRun: false, files: [], warnings: [] })

    expect(logSpy).toHaveBeenCalledOnce()
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toEqual({
      command: 'test',
      ok: true,
      dryRun: false,
      files: [],
      warnings: [],
    })
  })
})

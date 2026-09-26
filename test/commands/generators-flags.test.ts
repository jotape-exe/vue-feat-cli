import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME, defaultConfig } from '../../src/config'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { generateComponent } = await import('../../src/commands/generate-component')
const { generateComposable } = await import('../../src/commands/generate-composable')
const { generateService } = await import('../../src/commands/generate-service')
const { generateStore } = await import('../../src/commands/generate-store')
const { generateFeat } = await import('../../src/commands/generate-feat')

function setupSpies() {
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new ProcessExitError(code)
  }) as never)
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  return { exitSpy, logSpy }
}

const parseJsonLogs = (logSpy: ReturnType<typeof vi.spyOn>) =>
  JSON.parse(logSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n'))

describe('generateComponent flags', () => {
  let project: TmpProject
  let spies: ReturnType<typeof setupSpies>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    spies = setupSpies()
  })

  afterEach(async () => {
    spies.exitSpy.mockRestore()
    spies.logSpy.mockRestore()
    await project.cleanup()
  })

  it('--dry-run previews without writing', async () => {
    const result = await generateComponent('ProductCard', { dryRun: true })

    expect(result?.dryRun).toBe(true)
    expect(result?.files[0]?.status).toBe('dry-run')
    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue'),
      ),
    ).toBe(false)
  })

  it('--json creates the file and emits pure JSON', async () => {
    await generateComponent('ProductCard', { json: true })

    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue'),
      ),
    ).toBe(true)
    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.command).toBe('generate:component')
    expect(parsed.files[0].status).toBe('created')
  })

  it('--force overwrites an existing component', async () => {
    const out = path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue')
    await fs.ensureDir(path.dirname(out))
    await fs.writeFile(out, '// hand-written\n', 'utf-8')

    await generateComponent('ProductCard', { force: true })

    expect(await fs.readFile(out, 'utf-8')).not.toContain('hand-written')
  })

  it('throws when the component exists and --force is not set', async () => {
    const out = path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue')
    await fs.ensureDir(path.dirname(out))
    await fs.writeFile(out, '// hand-written\n', 'utf-8')

    await expect(generateComponent('ProductCard', {})).rejects.toThrow(/already exists/)
  })
})

describe('generateComposable flags', () => {
  let project: TmpProject
  let spies: ReturnType<typeof setupSpies>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    spies = setupSpies()
  })

  afterEach(async () => {
    spies.exitSpy.mockRestore()
    spies.logSpy.mockRestore()
    await project.cleanup()
  })

  it('--dry-run previews without writing', async () => {
    const result = await generateComposable('filters', { dryRun: true })

    expect(result?.dryRun).toBe(true)
    expect(result?.files[0]?.status).toBe('dry-run')
    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts'),
      ),
    ).toBe(false)
  })

  it('--json creates the file and emits pure JSON', async () => {
    await generateComposable('filters', { json: true })

    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts'),
      ),
    ).toBe(true)
    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.command).toBe('generate:composable')
    expect(parsed.files[0].status).toBe('created')
  })

  it('--force overwrites an existing composable', async () => {
    const out = path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts')
    await fs.ensureDir(path.dirname(out))
    await fs.writeFile(out, '// hand-written\n', 'utf-8')

    await generateComposable('filters', { force: true })

    expect(await fs.readFile(out, 'utf-8')).not.toContain('hand-written')
  })

  it('throws when the composable exists and --force is not set', async () => {
    const out = path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts')
    await fs.ensureDir(path.dirname(out))
    await fs.writeFile(out, '// hand-written\n', 'utf-8')

    await expect(generateComposable('filters', {})).rejects.toThrow(/already exists/)
  })
})

describe('generateService flags', () => {
  let project: TmpProject
  let spies: ReturnType<typeof setupSpies>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    spies = setupSpies()
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))
  })

  afterEach(async () => {
    spies.exitSpy.mockRestore()
    spies.logSpy.mockRestore()
    await project.cleanup()
  })

  it('--dry-run previews service + types without writing', async () => {
    const result = (await generateService('product', {
      feature: 'acme',
      dryRun: true,
    })) as { dryRun: boolean; files: { status: string }[] }

    expect(result.dryRun).toBe(true)
    expect(result.files).toHaveLength(2)
    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'features', 'acme', 'services', 'product.service.ts'),
      ),
    ).toBe(false)
  })

  it('--json emits pure JSON with created files', async () => {
    await generateService('product', { feature: 'acme', json: true })

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.command).toBe('generate:service')
    expect(parsed.ok).toBe(true)
    expect(parsed.files.map((f: { status: string }) => f.status)).toContain('created')
  })

  it('--force overwrites the service but still preserves existing types', async () => {
    const servicePath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'services',
      'product.service.ts',
    )
    const typesPath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'types',
      'product.types.ts',
    )
    await fs.ensureDir(path.dirname(servicePath))
    await fs.ensureDir(path.dirname(typesPath))
    await fs.writeFile(servicePath, '// hand-written service\n', 'utf-8')
    await fs.writeFile(typesPath, '// hand-written types\n', 'utf-8')

    await generateService('product', { feature: 'acme', force: true })

    expect(await fs.readFile(servicePath, 'utf-8')).not.toContain('hand-written service')
    expect(await fs.readFile(typesPath, 'utf-8')).toContain('hand-written types')
  })

  it('--json without --feature exits with a machine-readable error', async () => {
    await expect(generateService('product', { json: true })).rejects.toThrow(ProcessExitError)

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/--feature/)
  })
})

describe('generateStore flags', () => {
  let project: TmpProject
  let spies: ReturnType<typeof setupSpies>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    spies = setupSpies()
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'shop'))
  })

  afterEach(async () => {
    spies.exitSpy.mockRestore()
    spies.logSpy.mockRestore()
    await project.cleanup()
  })

  it('--dry-run previews store + types without writing', async () => {
    const result = (await generateStore('cart', {
      feature: 'shop',
      dryRun: true,
    })) as { dryRun: boolean; files: { status: string }[] }

    expect(result.dryRun).toBe(true)
    expect(result.files).toHaveLength(2)
    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'features', 'shop', 'stores', 'cart.store.ts'),
      ),
    ).toBe(false)
  })

  it('--json emits pure JSON with created files', async () => {
    await generateStore('cart', { feature: 'shop', json: true })

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.command).toBe('generate:store')
    expect(parsed.ok).toBe(true)
  })

  it('--force overwrites an existing store', async () => {
    const storePath = path.join(
      project.root,
      'src',
      'features',
      'shop',
      'stores',
      'cart.store.ts',
    )
    await fs.ensureDir(path.dirname(storePath))
    await fs.writeFile(storePath, '// hand-written store\n', 'utf-8')

    await generateStore('cart', { feature: 'shop', force: true })

    expect(await fs.readFile(storePath, 'utf-8')).not.toContain('hand-written store')
  })

  it('--json without --feature exits with a machine-readable error', async () => {
    await expect(generateStore('cart', { json: true })).rejects.toThrow(ProcessExitError)

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/--feature/)
  })
})

describe('generateFeat layer errors', () => {
  let project: TmpProject
  let spies: ReturnType<typeof setupSpies>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    spies = setupSpies()
  })

  afterEach(async () => {
    spies.exitSpy.mockRestore()
    spies.logSpy.mockRestore()
    await project.cleanup()
  })

  it('--exclude skips the listed layers', async () => {
    await generateFeat('acme', { exclude: 'store,types,index' })

    const base = path.join(project.root, 'src', 'features', 'acme')
    expect(await fs.pathExists(path.join(base, 'services', 'acme.service.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'stores', 'acme.store.ts'))).toBe(false)
    expect(await fs.pathExists(path.join(base, 'types', 'acme.types.ts'))).toBe(false)
    expect(await fs.pathExists(path.join(base, 'index.ts'))).toBe(false)
  })

  it('throws on an unknown layer name', async () => {
    await expect(generateFeat('acme', { only: 'nope' })).rejects.toThrow(/Unknown layer/)
  })

  it('--json reports an unknown layer as a machine-readable error', async () => {
    await expect(generateFeat('acme', { only: 'nope', json: true })).rejects.toThrow(
      ProcessExitError,
    )

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/Unknown layer/)
  })

  it('throws when no layers remain selected', async () => {
    await expect(generateFeat('acme', { only: 'view' })).rejects.toThrow(/No layers selected/)
  })

  it('--json collects dependency warnings instead of printing them', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesPinia: true,
    })

    await generateFeat('acme', { only: 'service', json: true })

    const parsed = parseJsonLogs(spies.logSpy)
    expect(parsed.ok).toBe(true)
    expect(parsed.warnings.join(' ')).toMatch(/pinia/)
  })
})

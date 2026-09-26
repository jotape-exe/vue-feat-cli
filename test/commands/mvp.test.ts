import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME, defaultConfig } from '../../src/config'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { generateFeat } = await import('../../src/commands/generate-feat')
const { doctor } = await import('../../src/commands/doctor')
const { agentsInit } = await import('../../src/commands/agents-init')

describe('MVP: layers + dry-run + json', () => {
  let project: TmpProject
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    logSpy.mockRestore()
    await project.cleanup()
  })

  const jsonOutput = () => JSON.parse(logSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n'))

  it('--only generates a partial feature', async () => {
    await generateFeat('acme', { only: 'service,store' })
    const base = path.join(project.root, 'src', 'features', 'acme')
    expect(await fs.pathExists(path.join(base, 'services', 'acme.service.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'stores', 'acme.store.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'types', 'acme.types.ts'))).toBe(false)
    expect(await fs.pathExists(path.join(base, 'index.ts'))).toBe(false)
  })

  it('--dry-run --json previews without writing and emits pure JSON', async () => {
    const result = (await generateFeat('acme', { only: 'service', dryRun: true, json: true })) as { dryRun: boolean; files: { status: string }[] }
    expect(result.dryRun).toBe(true)
    expect(await fs.pathExists(path.join(project.root, 'src', 'features', 'acme'))).toBe(false)
    const parsed = jsonOutput()
    expect(parsed.command).toBe('generate:feat')
    expect(parsed.files[0].status).toBe('dry-run')
  })

  it('--force overwrites an existing file', async () => {
    await generateFeat('acme', { only: 'service' })
    const result = (await generateFeat('acme', { only: 'service', force: true })) as { files: { status: string }[] }
    expect(result.files[0]?.status).toBe('overwritten')
  })

  it('reads layers defaults from vf.config.json', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), { ...defaultConfig, layers: { store: false } })
    await generateFeat('acme')
    const base = path.join(project.root, 'src', 'features', 'acme')
    expect(await fs.pathExists(path.join(base, 'stores', 'acme.store.ts'))).toBe(false)
    expect(await fs.pathExists(path.join(base, 'services', 'acme.service.ts'))).toBe(true)
  })
})

describe('MVP: doctor + agents:init', () => {
  let project: TmpProject
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    logSpy.mockRestore()
    await project.cleanup()
  })

  it('doctor --json returns checks, config and template inventory', async () => {
    const result = (await doctor({ json: true })) as { command: string; checks: unknown[]; config: unknown; templates: string[] }
    expect(result.command).toBe('doctor')
    expect(result.checks.length).toBeGreaterThan(0)
    expect(result.templates).toContain('component/Component.vue.hbs')
    const parsed = JSON.parse(logSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n'))
    expect(parsed.command).toBe('doctor')
  })

  it('agents:init writes AGENTS.md reflecting the config', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), { ...defaultConfig, usesVueRouter: true })
    await agentsInit()
    const content = await fs.readFile(path.join(project.root, 'AGENTS.md'), 'utf-8')
    expect(content).toContain('vue-feat-cli')
    expect(content).toContain('--dry-run --json')
  })
})

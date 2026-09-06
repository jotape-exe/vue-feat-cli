import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME, defaultConfig } from '../../src/config'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, cancel, log, text } = await import('../helpers/clack-mock')
const { generateStore } = await import('../../src/commands/generate-store')

describe('generateStore', () => {
  let project: TmpProject
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    project = await createTmpProject()
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))
    vi.clearAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ProcessExitError(code)
    }) as never)
  })

  afterEach(async () => {
    exitSpy.mockRestore()
    await project.cleanup()
  })

  it('falls back to a reactive() store and warns when Pinia is disabled', async () => {
    await generateStore('product', { feature: 'acme' })

    const storePath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'stores',
      'product.store.ts',
    )
    expect(await fs.pathExists(storePath)).toBe(true)
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Pinia not enabled'))
    const content = await fs.readFile(storePath, 'utf-8')
    expect(content).not.toMatch(/defineStore/)
  })

  it('warns when Pinia is enabled but not installed', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesPinia: true,
    })

    await generateStore('product', { feature: 'acme' })

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('not found in package.json'))
    const storePath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'stores',
      'product.store.ts',
    )
    const content = await fs.readFile(storePath, 'utf-8')
    expect(content).toMatch(/defineStore/)
  })

  it('generates a Pinia store without warnings when Pinia is enabled and installed', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      usesPinia: true,
    })
    await fs.writeJson(path.join(project.root, 'package.json'), {
      dependencies: { pinia: '^2.0.0' },
    })

    await generateStore('product', { feature: 'acme' })

    expect(log.warn).not.toHaveBeenCalled()
  })

  it('exits with an error when the target feature does not exist', async () => {
    await expect(generateStore('product', { feature: 'ghost' })).rejects.toThrow(ProcessExitError)
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
  })

  it('prompts for the feature when the option is not provided', async () => {
    text.mockResolvedValueOnce('acme')

    await generateStore('product', {})

    expect(text).toHaveBeenCalledOnce()
  })

  it('cancels cleanly when the feature prompt is aborted (e.g. Ctrl+C)', async () => {
    text.mockResolvedValueOnce(CANCEL)

    await expect(generateStore('product', {})).rejects.toThrow(ProcessExitError)
    expect(cancel).toHaveBeenCalled()
  })
})

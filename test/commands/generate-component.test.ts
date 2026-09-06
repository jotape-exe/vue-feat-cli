import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, cancel, log, text } = await import('../helpers/clack-mock')
const { generateComponent } = await import('../../src/commands/generate-component')

describe('generateComponent', () => {
  let project: TmpProject
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ProcessExitError(code)
    }) as never)
  })

  afterEach(async () => {
    exitSpy.mockRestore()
    await project.cleanup()
  })

  it('creates a shared component when no feature is given', async () => {
    await generateComponent('product-card', { feature: '' })

    const outputPath = path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue')
    expect(await fs.pathExists(outputPath)).toBe(true)
    const content = await fs.readFile(outputPath, 'utf-8')
    expect(content).toContain('ProductCard')
  })

  it('creates a component inside an existing feature', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))

    await generateComponent('widget', { feature: 'acme' })

    const outputPath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'components',
      'Widget.vue',
    )
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('supports nested component paths', async () => {
    await generateComponent('forms/product-form', { feature: '' })

    const outputPath = path.join(
      project.root,
      'src',
      'shared',
      'components',
      'forms',
      'ProductForm.vue',
    )
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('exits with an error when the target feature does not exist', async () => {
    await expect(generateComponent('widget', { feature: 'ghost' })).rejects.toThrow(
      ProcessExitError,
    )
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
  })

  it('prompts for the feature when the option is not provided', async () => {
    text.mockResolvedValueOnce('acme')
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))

    await generateComponent('widget', {})

    expect(text).toHaveBeenCalledOnce()
    const outputPath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'components',
      'Widget.vue',
    )
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('cancels cleanly when the feature prompt is aborted (e.g. Ctrl+C)', async () => {
    text.mockResolvedValueOnce(CANCEL)

    await expect(generateComponent('widget', {})).rejects.toThrow(ProcessExitError)
    expect(cancel).toHaveBeenCalled()
  })

  it('kebab-cases a feature name given in a different case', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'my-acme'))

    await generateComponent('widget', { feature: 'MyAcme' })

    const outputPath = path.join(
      project.root,
      'src',
      'features',
      'my-acme',
      'components',
      'Widget.vue',
    )
    expect(await fs.pathExists(outputPath)).toBe(true)
  })
})

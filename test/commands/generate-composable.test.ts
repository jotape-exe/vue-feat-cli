import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, cancel, log, text } = await import('../helpers/clack-mock')
const { generateComposable } = await import('../../src/commands/generate-composable')

describe('generateComposable', () => {
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

  it('creates a shared composable when no feature is given', async () => {
    await generateComposable('filters', { feature: '' })

    const outputPath = path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts')
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('creates a composable inside an existing feature', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))

    await generateComposable('filters', { feature: 'acme' })

    const outputPath = path.join(
      project.root,
      'src',
      'features',
      'acme',
      'composables',
      'useFilters.ts',
    )
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('exits with an error when the target feature does not exist', async () => {
    await expect(generateComposable('filters', { feature: 'ghost' })).rejects.toThrow(
      ProcessExitError,
    )
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
  })

  it('prompts for the feature when the option is not provided', async () => {
    text.mockResolvedValueOnce('')

    await generateComposable('filters', {})

    expect(text).toHaveBeenCalledOnce()
    const outputPath = path.join(project.root, 'src', 'shared', 'composables', 'useFilters.ts')
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('cancels cleanly when the feature prompt is aborted (e.g. Ctrl+C)', async () => {
    text.mockResolvedValueOnce(CANCEL)

    await expect(generateComposable('filters', {})).rejects.toThrow(ProcessExitError)
    expect(cancel).toHaveBeenCalled()
  })
})

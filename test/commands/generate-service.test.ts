import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, cancel, log, text } = await import('../helpers/clack-mock')
const { generateService } = await import('../../src/commands/generate-service')

describe('generateService', () => {
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

  it('creates the service, its types, and the http client for an existing feature', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))

    await generateService('product', { feature: 'acme' })

    const base = path.join(project.root, 'src', 'features', 'acme')
    expect(await fs.pathExists(path.join(base, 'services', 'product.service.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(base, 'types', 'product.types.ts'))).toBe(true)
    expect(
      await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts')),
    ).toBe(true)
    expect(await fs.pathExists(path.join(project.root, '.env.example'))).toBe(true)
  })

  it('does not overwrite an existing types file', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))
    const typesPath = path.join(project.root, 'src', 'features', 'acme', 'types', 'product.types.ts')
    await fs.ensureDir(path.dirname(typesPath))
    await fs.writeFile(typesPath, '// hand-written types\n', 'utf-8')

    await generateService('product', { feature: 'acme' })

    expect(await fs.readFile(typesPath, 'utf-8')).toContain('hand-written types')
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('already exist'))
  })

  it('does not recreate the http client when one already exists', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))
    const clientPath = path.join(project.root, 'src', 'shared', 'http', 'client.ts')
    await fs.ensureDir(path.dirname(clientPath))
    await fs.writeFile(clientPath, '// custom client\n', 'utf-8')

    await generateService('product', { feature: 'acme' })

    expect(await fs.readFile(clientPath, 'utf-8')).toContain('custom client')
  })

  it('exits with an error when the target feature does not exist', async () => {
    await expect(generateService('product', { feature: 'ghost' })).rejects.toThrow(
      ProcessExitError,
    )
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('not found'))
  })

  it('prompts for the feature when the option is not provided', async () => {
    await fs.ensureDir(path.join(project.root, 'src', 'features', 'acme'))
    text.mockResolvedValueOnce('acme')

    await generateService('product', {})

    expect(text).toHaveBeenCalledOnce()
    expect(
      await fs.pathExists(
        path.join(project.root, 'src', 'features', 'acme', 'services', 'product.service.ts'),
      ),
    ).toBe(true)
  })

  it('cancels cleanly when the feature prompt is aborted (e.g. Ctrl+C)', async () => {
    text.mockResolvedValueOnce(CANCEL)

    await expect(generateService('product', {})).rejects.toThrow(ProcessExitError)
    expect(cancel).toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, select } = await import('../helpers/clack-mock')
const { help } = await import('../../src/commands/help')

describe('help', () => {
  let project: TmpProject
  let exitSpy: ReturnType<typeof vi.spyOn>
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    project = await createTmpProject()
    vi.clearAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ProcessExitError(code)
    }) as never)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    exitSpy.mockRestore()
    logSpy.mockRestore()
    await project.cleanup()
  })

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n')

  it('prints detailed docs for a known command', async () => {
    await help('init')
    expect(output()).toContain('vf init [options]')
  })

  it('resolves a command alias to its canonical doc', async () => {
    await help('g:feat')
    expect(output()).toContain('generate:feat')
  })

  it('exits with an error for an unknown command', async () => {
    await expect(help('does-not-exist')).rejects.toThrow(ProcessExitError)
    expect(output()).toContain('Unknown command')
  })

  it('prints the overview and opens the picked command doc when a command is chosen interactively', async () => {
    select.mockResolvedValueOnce('init')

    await help()

    expect(output()).toContain('vue-feat-cli')
    expect(output()).toContain('vf init [options]')
  })

  it('prints only the overview when the interactive picker is cancelled', async () => {
    select.mockResolvedValueOnce(CANCEL)

    await help()

    expect(output()).toContain('vue-feat-cli')
    expect(output()).not.toContain('vf init [options]')
  })

  it('prints only the overview when "Exit" is chosen', async () => {
    select.mockResolvedValueOnce('__exit__')

    await help()

    expect(output()).toContain('vue-feat-cli')
    expect(output()).not.toContain('vf init [options]')
  })
})

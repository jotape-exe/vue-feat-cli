import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME, defaultConfig } from '../../src/config'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { confirm, log } = await import('../helpers/clack-mock')
const { initTemplates } = await import('../../src/commands/init-templates')

describe('initTemplates', () => {
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

  it('copies the built-in templates and writes CONTEXT.md to .vf/templates by default', async () => {
    await initTemplates()

    const dest = path.join(project.root, '.vf', 'templates')
    expect(await fs.pathExists(path.join(dest, 'component', 'Component.vue.hbs'))).toBe(true)
    expect(await fs.pathExists(path.join(dest, 'CONTEXT.md'))).toBe(true)
  })

  it('adds templatesDir to vf.config.json when it was not already configured', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), defaultConfig)

    await initTemplates()

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config.templatesDir).toBe('.vf/templates')
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Added'))
  })

  it('does not touch vf.config.json when templatesDir is already configured', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      templatesDir: 'custom/templates',
    })

    await initTemplates()

    expect(await fs.pathExists(path.join(project.root, 'custom', 'templates', 'CONTEXT.md'))).toBe(
      true,
    )
    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config.templatesDir).toBe('custom/templates')
  })

  it('asks before overwriting a non-empty templates directory and aborts on decline', async () => {
    const dest = path.join(project.root, '.vf', 'templates')
    await fs.ensureDir(dest)
    await fs.writeFile(path.join(dest, 'existing.hbs'), 'keep me', 'utf-8')
    confirm.mockResolvedValueOnce(false)

    await expect(initTemplates()).rejects.toThrow(ProcessExitError)

    expect(await fs.readFile(path.join(dest, 'existing.hbs'), 'utf-8')).toBe('keep me')
  })

  it('overwrites the templates directory when the user confirms', async () => {
    const dest = path.join(project.root, '.vf', 'templates')
    await fs.ensureDir(dest)
    await fs.writeFile(path.join(dest, 'existing.hbs'), 'keep me', 'utf-8')
    confirm.mockResolvedValueOnce(true)

    await initTemplates()

    expect(await fs.pathExists(path.join(dest, 'component', 'Component.vue.hbs'))).toBe(true)
  })

  it('rejects a templatesDir that resolves outside the project root', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), {
      ...defaultConfig,
      templatesDir: '../../../../../../tmp/escaped',
    })

    await expect(initTemplates()).rejects.toThrow(ProcessExitError)
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('outside the project root'))
  })
})

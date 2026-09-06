import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG_FILENAME } from '../../src/config'
import { createTmpProject, ProcessExitError, type TmpProject } from '../helpers/tmp-project'

vi.mock('@clack/prompts', () => import('../helpers/clack-mock'))

const { CANCEL, confirm, log, select, text } = await import('../helpers/clack-mock')
const { init } = await import('../../src/commands/init')

describe('init', () => {
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

  it('--yes writes the all-defaults config on a bare project without prompting', async () => {
    await init({ yes: true })

    expect(confirm).not.toHaveBeenCalled()
    expect(select).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config).toMatchObject({
      usesPinia: false,
      usesVueRouter: false,
      usesTanstackQuery: false,
      httpClient: 'fetch',
      alias: '@',
    })
    expect(config.templatesDir).toBeUndefined()
  })

  it('--yes detects installed dependencies and the tsconfig alias', async () => {
    await fs.writeJson(path.join(project.root, 'package.json'), {
      dependencies: { pinia: '^2.0.0', 'vue-router': '^4.0.0', axios: '^1.0.0' },
      devDependencies: { '@tanstack/vue-query': '^5.0.0' },
    })
    await fs.writeJson(path.join(project.root, 'tsconfig.json'), {
      compilerOptions: { paths: { '~/*': ['src/*'] } },
    })

    await init({ yes: true })

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config).toMatchObject({
      usesPinia: true,
      usesVueRouter: true,
      usesTanstackQuery: true,
      httpClient: 'axios',
      alias: '~',
    })
  })

  it('--yes falls back to the default alias when tsconfig.json is not valid JSON', async () => {
    // A tsconfig.json with // comments (common in real projects, and this repo's
    // own tsconfig.json) is not valid JSON — fs.readJson throws and detectAlias
    // must swallow it rather than crashing init.
    await fs.writeFile(
      path.join(project.root, 'tsconfig.json'),
      `{\n  // comment\n  "compilerOptions": { "paths": { "@/*": ["src/*"] } }\n}\n`,
      'utf-8',
    )

    await init({ yes: true })

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config.alias).toBe('@')
  })

  it('--yes creates the shared directory structure and the http client', async () => {
    await init({ yes: true })

    for (const rel of ['components', 'composables', 'utils', 'http']) {
      expect(await fs.pathExists(path.join(project.root, 'src', 'shared', rel))).toBe(true)
    }
    expect(await fs.pathExists(path.join(project.root, 'src', 'features'))).toBe(true)
    expect(await fs.pathExists(path.join(project.root, 'src', 'shared', 'http', 'client.ts'))).toBe(
      true,
    )
  })

  it('--yes overwrites an existing config without asking', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), { alias: 'old' })

    await init({ yes: true })

    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('overwriting'))
    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config.alias).toBe('@')
  })

  it('cancels without writing when the user declines to overwrite an existing config', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), { alias: 'old' })
    confirm.mockResolvedValueOnce(false)

    await expect(init({})).rejects.toThrow(ProcessExitError)

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config.alias).toBe('old')
  })

  it('cancels when a prompt is aborted (e.g. Ctrl+C) mid-flow', async () => {
    confirm.mockResolvedValueOnce(CANCEL) // usesPinia

    await expect(init({})).rejects.toThrow(ProcessExitError)
  })

  it('walks the full interactive flow and saves the chosen answers', async () => {
    confirm
      .mockResolvedValueOnce(true) // usesPinia
      .mockResolvedValueOnce(true) // usesVueRouter
      .mockResolvedValueOnce(false) // usesTanstackQuery
      .mockResolvedValueOnce(true) // useCustomTemplates
    select.mockResolvedValueOnce('axios') // httpClient
    text.mockResolvedValueOnce('~') // alias

    await init({})

    const config = await fs.readJson(path.join(project.root, CONFIG_FILENAME))
    expect(config).toMatchObject({
      usesPinia: true,
      usesVueRouter: true,
      usesTanstackQuery: false,
      httpClient: 'axios',
      alias: '~',
      templatesDir: '.vf/templates',
    })
    expect(await fs.pathExists(path.join(project.root, '.vf', 'templates'))).toBe(true)
  })
})

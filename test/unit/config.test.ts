import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONFIG_FILENAME, defaultConfig, loadConfig, saveConfig } from '../../src/config'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

describe('loadConfig', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('returns the default config when no config file exists', async () => {
    expect(await loadConfig(project.root)).toEqual(defaultConfig)
  })

  it('merges a partial user config over the defaults', async () => {
    await fs.writeJson(path.join(project.root, CONFIG_FILENAME), { usesPinia: true, alias: '~' })
    const config = await loadConfig(project.root)
    expect(config.usesPinia).toBe(true)
    expect(config.alias).toBe('~')
    expect(config.httpClient).toBe(defaultConfig.httpClient)
  })
})

describe('saveConfig', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('persists a config that loadConfig can read back', async () => {
    const config = { ...defaultConfig, usesPinia: true, httpClient: 'axios' as const }
    await saveConfig(project.root, config)

    const configPath = path.join(project.root, CONFIG_FILENAME)
    expect(await fs.pathExists(configPath)).toBe(true)
    expect(await loadConfig(project.root)).toEqual(config)
  })
})

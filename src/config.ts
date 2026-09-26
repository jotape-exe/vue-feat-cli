import fs from 'fs-extra'
import path from 'path'

export type FeatLayer =
  | 'service'
  | 'serviceComposable'
  | 'pageComposable'
  | 'store'
  | 'types'
  | 'index'
  | 'routes'
  | 'view'

export interface VfConfig {
  srcDir: string
  featuresDir: string
  sharedDir: string
  alias: string
  httpClient: 'fetch' | 'axios'
  usesPinia: boolean
  usesVueRouter: boolean
  usesTanstackQuery: boolean
  templatesDir?: string
  /** Per-layer defaults. `false` disables the layer unless re-enabled via `--only`. */
  layers?: Partial<Record<FeatLayer, boolean>>
}

export const defaultConfig: VfConfig = {
  srcDir: 'src',
  featuresDir: 'src/features',
  sharedDir: 'src/shared',
  alias: '@',
  httpClient: 'fetch',
  usesPinia: false,
  usesVueRouter: false,
  usesTanstackQuery: false,
}

export const CONFIG_FILENAME = 'vf.config.json'

export async function loadConfig(root: string): Promise<VfConfig> {
  const configPath = path.join(root, CONFIG_FILENAME)
  if (await fs.pathExists(configPath)) {
    const userConfig = await fs.readJson(configPath)
    return { ...defaultConfig, ...userConfig }
  }
  return defaultConfig
}

export async function saveConfig(root: string, config: VfConfig): Promise<void> {
  const configPath = path.join(root, CONFIG_FILENAME)
  await fs.writeJson(configPath, config, { spaces: 2 })
}
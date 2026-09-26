import type { FeatLayer, VfConfig } from '../config'

export const FEAT_LAYERS: FeatLayer[] = [
  'service',
  'serviceComposable',
  'pageComposable',
  'store',
  'types',
  'index',
  'routes',
  'view',
]

const ALIASES: Record<string, FeatLayer | 'composables'> = {
  service: 'service',
  store: 'store',
  types: 'types',
  type: 'types',
  index: 'index',
  routes: 'routes',
  route: 'routes',
  view: 'view',
  views: 'view',
  composables: 'composables',
  composable: 'composables',
  servicecomposable: 'serviceComposable',
  'service-composable': 'serviceComposable',
  service_composable: 'serviceComposable',
  useservices: 'serviceComposable',
  pagecomposable: 'pageComposable',
  'page-composable': 'pageComposable',
  page_composable: 'pageComposable',
  usepage: 'pageComposable',
}

export function parseLayerList(input?: string): FeatLayer[] {
  if (!input) return []
  const out: FeatLayer[] = []
  for (const raw of input.split(',')) {
    const key = raw.trim().toLowerCase().replace(/_/g, '-')
    if (!key) continue
    const mapped = ALIASES[key]
    if (!mapped) throw new Error(`Unknown layer "${raw.trim()}". Valid: ${FEAT_LAYERS.join(', ')} (+ "composables" for both)`)
    if (mapped === 'composables') {
      out.push('serviceComposable', 'pageComposable')
    } else if (!out.includes(mapped)) {
      out.push(mapped)
    }
  }
  return [...new Set(out)]
}

export interface FeatLayerOptions {
  only?: string
  exclude?: string
  /** cac maps `--no-store` to `{ store: false }`. */
  store?: boolean
  service?: boolean
  types?: boolean
  routes?: boolean
  view?: boolean
  index?: boolean
  composables?: boolean
}

export function resolveFeatLayers(
  config: VfConfig,
  options: FeatLayerOptions = {},
): { enabled: Set<FeatLayer>; warnings: string[] } {
  const warnings: string[] = []
  const enabled = new Set<FeatLayer>(FEAT_LAYERS)

  for (const layer of FEAT_LAYERS) {
    if (config.layers?.[layer] === false) enabled.delete(layer)
  }

  if (!config.usesVueRouter) {
    enabled.delete('routes')
    enabled.delete('view')
  }

  if (options.store === false) enabled.delete('store')
  if (options.service === false) enabled.delete('service')
  if (options.types === false) enabled.delete('types')
  if (options.routes === false) enabled.delete('routes')
  if (options.view === false) enabled.delete('view')
  if (options.index === false) enabled.delete('index')
  if (options.composables === false) {
    enabled.delete('serviceComposable')
    enabled.delete('pageComposable')
  }

  if (options.exclude) {
    for (const layer of parseLayerList(options.exclude)) enabled.delete(layer)
  }

  if (options.only) {
    const only = parseLayerList(options.only)
    const next = new Set<FeatLayer>()
    for (const layer of only) {
      if ((layer === 'routes' || layer === 'view') && !config.usesVueRouter) {
        warnings.push(`Layer "${layer}" requires usesVueRouter: true — skipped.`)
        continue
      }
      next.add(layer)
    }
    return { enabled: next, warnings }
  }

  return { enabled, warnings }
}

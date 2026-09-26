import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../../src/config'
import { parseLayerList, resolveFeatLayers } from '../../src/utils/feat-layers'

describe('parseLayerList', () => {
  it('parses comma-separated layers', () => {
    expect(parseLayerList('service,store')).toEqual(['service', 'store'])
  })

  it('expands the "composables" alias to both composables', () => {
    expect(parseLayerList('composables')).toEqual(['serviceComposable', 'pageComposable'])
  })

  it('throws on unknown layers', () => {
    expect(() => parseLayerList('nope')).toThrow(/Unknown layer/)
  })
})

describe('resolveFeatLayers', () => {
  it('enables everything except routes/view without a router', () => {
    const { enabled } = resolveFeatLayers({ ...defaultConfig, usesVueRouter: false })
    expect(enabled.has('service')).toBe(true)
    expect(enabled.has('routes')).toBe(false)
    expect(enabled.has('view')).toBe(false)
  })

  it('honors --only as a whitelist', () => {
    const { enabled } = resolveFeatLayers({ ...defaultConfig, usesVueRouter: true }, { only: 'service,store' })
    expect([...enabled].sort()).toEqual(['service', 'store'])
  })

  it('honors --exclude and --no-* negations', () => {
    const { enabled } = resolveFeatLayers(
      { ...defaultConfig, usesVueRouter: true },
      { exclude: 'view,routes', store: false },
    )
    expect(enabled.has('store')).toBe(false)
    expect(enabled.has('view')).toBe(false)
    expect(enabled.has('service')).toBe(true)
  })

  it('honors config.layers defaults', () => {
    const { enabled } = resolveFeatLayers({
      ...defaultConfig,
      usesVueRouter: true,
      layers: { store: false },
    })
    expect(enabled.has('store')).toBe(false)
    expect(enabled.has('service')).toBe(true)
  })

  it('warns when --only requests router layers without a router', () => {
    const { enabled, warnings } = resolveFeatLayers({ ...defaultConfig, usesVueRouter: false }, { only: 'service,view' })
    expect(enabled.has('view')).toBe(false)
    expect(warnings.join(' ')).toMatch(/usesVueRouter/)
  })
})

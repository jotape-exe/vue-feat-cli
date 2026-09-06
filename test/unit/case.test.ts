import { describe, expect, it } from 'vitest'
import { camelCase, kebabCase, pascalCase } from '../../src/utils/case'

describe('pascalCase', () => {
  it('capitalizes a single word', () => {
    expect(pascalCase('product')).toBe('Product')
  })

  it('converts kebab-case', () => {
    expect(pascalCase('product-card')).toBe('ProductCard')
  })

  it('converts snake_case', () => {
    expect(pascalCase('product_card')).toBe('ProductCard')
  })

  it('handles mixed kebab and snake case', () => {
    expect(pascalCase('my-component_name')).toBe('MyComponentName')
  })

  it('leaves already-PascalCase input unchanged', () => {
    expect(pascalCase('ProductCard')).toBe('ProductCard')
  })

  it('capitalizes an already-camelCase word', () => {
    expect(pascalCase('useFilters')).toBe('UseFilters')
  })

  it('returns an empty string for empty input', () => {
    expect(pascalCase('')).toBe('')
  })

  it('handles a single character', () => {
    expect(pascalCase('a')).toBe('A')
  })
})

describe('camelCase', () => {
  it('lowercases the first letter of a kebab-case word', () => {
    expect(camelCase('product-card')).toBe('productCard')
  })

  it('lowercases the first letter of a PascalCase word', () => {
    expect(camelCase('ProductCard')).toBe('productCard')
  })

  it('leaves already-camelCase input unchanged', () => {
    expect(camelCase('productCard')).toBe('productCard')
  })

  it('returns an empty string for empty input', () => {
    expect(camelCase('')).toBe('')
  })

  it('handles a single character', () => {
    expect(camelCase('A')).toBe('a')
  })
})

describe('kebabCase', () => {
  it('inserts a dash at camelCase boundaries', () => {
    expect(kebabCase('productCard')).toBe('product-card')
  })

  it('inserts a dash at PascalCase boundaries', () => {
    expect(kebabCase('ProductCard')).toBe('product-card')
  })

  it('replaces underscores with dashes', () => {
    expect(kebabCase('product_card')).toBe('product-card')
  })

  it('replaces spaces with dashes', () => {
    expect(kebabCase('Product Card')).toBe('product-card')
  })

  it('collapses repeated separators into a single dash', () => {
    expect(kebabCase('product   card')).toBe('product-card')
  })

  it('leaves already-kebab-case input unchanged', () => {
    expect(kebabCase('product-card')).toBe('product-card')
  })

  it('lowercases a plain word', () => {
    expect(kebabCase('Product')).toBe('product')
  })

  it('does not split consecutive uppercase letters (acronym limitation)', () => {
    // Documents current behavior: no boundary is inserted between two
    // consecutive uppercase letters, only between a lowercase→uppercase pair.
    expect(kebabCase('APIKey')).toBe('apikey')
  })

  it('returns an empty string for empty input', () => {
    expect(kebabCase('')).toBe('')
  })
})

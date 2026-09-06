import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderTemplate } from '../../src/utils/render'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

describe('renderTemplate', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('compiles the built-in template and writes the output file', async () => {
    const outputPath = path.join(project.root, 'src', 'shared', 'components', 'ProductCard.vue')

    const created = await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { name: 'product-card', Name: 'ProductCard' },
    })

    expect(created).toBe(outputPath)
    const content = await fs.readFile(outputPath, 'utf-8')
    expect(content).toContain('ProductCard')
  })

  it('creates parent directories that do not exist yet', async () => {
    const outputPath = path.join(project.root, 'deep', 'nested', 'dir', 'Foo.vue')
    await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { name: 'foo', Name: 'Foo' },
    })
    expect(await fs.pathExists(outputPath)).toBe(true)
  })

  it('throws when the output file already exists and skipIfExists is not set', async () => {
    const outputPath = path.join(project.root, 'Foo.vue')
    await fs.ensureFile(outputPath)

    await expect(
      renderTemplate({
        template: 'component/Component.vue.hbs',
        outputPath,
        context: { name: 'foo', Name: 'Foo' },
      }),
    ).rejects.toThrow(/already exists/)
  })

  it('returns null instead of throwing when skipIfExists is true and the file exists', async () => {
    const outputPath = path.join(project.root, 'Foo.vue')
    await fs.ensureFile(outputPath)

    const result = await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { name: 'foo', Name: 'Foo' },
      skipIfExists: true,
    })

    expect(result).toBeNull()
  })

  it('prefers a local template override over the built-in default', async () => {
    const templatesDir = '.vf/templates'
    const overridePath = path.join(project.root, templatesDir, 'component/Component.vue.hbs')
    await fs.ensureDir(path.dirname(overridePath))
    await fs.writeFile(overridePath, '<template><div>CUSTOM {{Name}}</div></template>', 'utf-8')

    const outputPath = path.join(project.root, 'Foo.vue')
    await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { Name: 'Foo' },
      templatesDir,
      root: project.root,
    })

    const content = await fs.readFile(outputPath, 'utf-8')
    expect(content).toContain('CUSTOM Foo')
  })

  it('falls back to the built-in template when no local override exists for that file', async () => {
    // templatesDir is configured but empty — resolveTemplatePath must still find the default.
    const outputPath = path.join(project.root, 'Foo.vue')
    await renderTemplate({
      template: 'component/Component.vue.hbs',
      outputPath,
      context: { name: 'foo', Name: 'Foo' },
      templatesDir: '.vf/templates',
      root: project.root,
    })

    const content = await fs.readFile(outputPath, 'utf-8')
    expect(content).toContain('Foo')
  })

  it('rejects a template path that escapes the project root', async () => {
    const outputPath = path.join(project.root, 'Foo.vue')
    await expect(
      renderTemplate({
        template: '../../../../../../etc/passwd',
        outputPath,
        context: {},
        templatesDir: '.vf/templates',
        root: project.root,
      }),
    ).rejects.toThrow(/escapes the project root/)
  })
})

import fs from 'fs-extra'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasDependency } from '../../src/utils/package'
import { createTmpProject, type TmpProject } from '../helpers/tmp-project'

describe('hasDependency', () => {
  let project: TmpProject

  beforeEach(async () => {
    project = await createTmpProject()
  })

  afterEach(async () => {
    await project.cleanup()
  })

  it('returns false when package.json does not exist', async () => {
    expect(await hasDependency(project.root, 'pinia')).toBe(false)
  })

  it('returns true when the package is a dependency', async () => {
    await fs.writeJson(path.join(project.root, 'package.json'), {
      dependencies: { pinia: '^2.0.0' },
    })
    expect(await hasDependency(project.root, 'pinia')).toBe(true)
  })

  it('returns true when the package is a devDependency', async () => {
    await fs.writeJson(path.join(project.root, 'package.json'), {
      devDependencies: { vitest: '^2.0.0' },
    })
    expect(await hasDependency(project.root, 'vitest')).toBe(true)
  })

  it('returns false when the package is absent from both sections', async () => {
    await fs.writeJson(path.join(project.root, 'package.json'), {
      dependencies: { vue: '^3.0.0' },
    })
    expect(await hasDependency(project.root, 'pinia')).toBe(false)
  })
})

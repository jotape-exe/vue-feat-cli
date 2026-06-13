import fs from 'fs-extra'
import path from 'path'

export async function hasDependency(root: string, name: string): Promise<boolean> {
  const pkgPath = path.join(root, 'package.json')
  if (!(await fs.pathExists(pkgPath))) return false
  const pkg = await fs.readJson(pkgPath)
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name])
}

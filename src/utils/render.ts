import fs from 'fs-extra'
import Handlebars from 'handlebars'
import path from 'path'
import prettier from 'prettier'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In dev (tsx), __dirname = src/utils/ → ../templates = src/templates/
// In prod (tsup bundle), __dirname = dist/ → ./templates = dist/templates/
export const TEMPLATES_DIR = __dirname.endsWith('utils')
  ? path.resolve(__dirname, '../templates')
  : path.resolve(__dirname, 'templates')

interface RenderOptions {
  template: string
  outputPath: string
  context: Record<string, unknown>
  skipIfExists?: boolean
  templatesDir?: string
  root?: string
}

async function resolveTemplatePath(template: string, root: string, templatesDir: string): Promise<string> {
  const safeRoot = path.resolve(root) + path.sep
  const localPath = path.resolve(root, templatesDir, template)

  if (!localPath.startsWith(safeRoot)) {
    throw new Error(`Security: template path "${template}" escapes the project root.`)
  }

  if (await fs.pathExists(localPath)) return localPath

  return path.join(TEMPLATES_DIR, template)
}

export async function renderTemplate({
  template,
  outputPath,
  context,
  skipIfExists = false,
  templatesDir,
  root,
}: RenderOptions): Promise<string | null> {
  const templatePath =
    templatesDir && root
      ? await resolveTemplatePath(template, root, templatesDir)
      : path.join(TEMPLATES_DIR, template)

  const raw = await fs.readFile(templatePath, 'utf-8')

  const compiled = Handlebars.compile(raw)
  let output = compiled(context)

  const parser = outputPath.endsWith('.vue') ? 'vue' : 'typescript'
  try {
    output = await prettier.format(output, { parser, semi: false, singleQuote: true })
  } catch {
    // ignore formatting errors (e.g. .vue without plugin)
  }

  await fs.ensureDir(path.dirname(outputPath))

  if (await fs.pathExists(outputPath)) {
    if (skipIfExists) return null
    throw new Error(`File already exists: ${outputPath}`)
  }

  await fs.writeFile(outputPath, output, 'utf-8')
  return outputPath
}

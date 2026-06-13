import fs from 'fs-extra'
import Handlebars from 'handlebars'
import path from 'path'
import prettier from 'prettier'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// In dev (tsx), __dirname = src/utils/ → ../templates = src/templates/
// In prod (tsup bundle), __dirname = dist/ → ./templates = dist/templates/
const TEMPLATES_DIR = __dirname.endsWith('utils')
  ? path.resolve(__dirname, '../templates')
  : path.resolve(__dirname, 'templates')

interface RenderOptions {
  template: string
  outputPath: string
  context: Record<string, unknown>
  skipIfExists?: boolean
}

export async function renderTemplate({
  template,
  outputPath,
  context,
  skipIfExists = false,
}: RenderOptions): Promise<string | null> {
  const templatePath = path.join(TEMPLATES_DIR, template)
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
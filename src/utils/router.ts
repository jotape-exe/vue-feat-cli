import { log } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import type { VfConfig } from '../config'

function insertAfterLastImport(content: string, importLine: string): string {
  const lines = content.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) lastImportIdx = i
  }
  if (lastImportIdx === -1) return importLine + '\n' + content
  lines.splice(lastImportIdx + 1, 0, importLine)
  return lines.join('\n')
}

function insertBeforeRoutesClose(content: string, spread: string): string {
  const routesKeyword = content.indexOf('routes:')
  if (routesKeyword === -1) return content

  const openBracket = content.indexOf('[', routesKeyword)
  if (openBracket === -1) return content

  let depth = 0
  let closeIdx = -1
  for (let i = openBracket; i < content.length; i++) {
    if (content[i] === '[') depth++
    else if (content[i] === ']') {
      depth--
      if (depth === 0) { closeIdx = i; break }
    }
  }
  if (closeIdx === -1) return content

  // Walk back to the start of the ']' line so we insert before it (preserving its indentation)
  let lineStart = closeIdx
  while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--

  // Infer indentation from the last content line before the ']' line
  const before = content.substring(0, lineStart)
  const lastContentLine = before.split('\n').filter((l) => l.trim()).pop() ?? ''
  const indent = lastContentLine.match(/^(\s+)/)?.[1] ?? '    '

  return before + `${indent}${spread},\n` + content.substring(lineStart)
}

export async function registerRouteInRouter(
  root: string,
  config: VfConfig,
  featureName: string,
  nameCamel: string,
): Promise<void> {
  const routerPath = path.join(root, config.srcDir, 'router', 'index.ts')

  if (!(await fs.pathExists(routerPath))) {
    log.warn(`Router not found at ${path.relative(root, routerPath)} — skipping route registration.`)
    return
  }

  let content = await fs.readFile(routerPath, 'utf-8')

  if (content.includes(`${nameCamel}Routes`)) {
    log.info(`Route for "${featureName}" is already registered in the router (skipped).`)
    return
  }

  const routerDir = path.dirname(routerPath)
  const featureRoutesPath = path.join(root, config.featuresDir, featureName, 'routes')
  const relImport = path.relative(routerDir, featureRoutesPath).replace(/\\/g, '/')
  const importLine = `import { ${nameCamel}Routes } from '${relImport.startsWith('.') ? relImport : `./${relImport}`}'`

  content = insertAfterLastImport(content, importLine)
  content = insertBeforeRoutesClose(content, `...${nameCamel}Routes`)

  await fs.writeFile(routerPath, content, 'utf-8')
  log.success(`Registered route in ${path.relative(root, routerPath)}`)
}

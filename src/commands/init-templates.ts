import { confirm, intro, log, outro } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { CONFIG_FILENAME, defaultConfig, loadConfig } from '../config'
import { TEMPLATES_DIR } from '../utils/render'

const CONTEXT_MD = `# Handlebars Context — vue-feat-cli templates

This file documents every variable available in each template group.
All variables are injected automatically by the CLI — no configuration needed.

---

## feature/ templates

Used by: \`vf generate:feat <name>\`, \`vf generate:service <name>\`, \`vf generate:store <name>\`

| Variable      | Type      | Example (input: "product")  | Description                        |
|---------------|-----------|-----------------------------|------------------------------------|
| \`name\`        | \`string\`  | \`product\`                   | kebab-case feature name            |
| \`Name\`        | \`string\`  | \`Product\`                   | PascalCase feature name            |
| \`nameCamel\`   | \`string\`  | \`product\`                   | camelCase feature name             |
| \`alias\`       | \`string\`  | \`@\`                         | import alias from vf.config.json   |
| \`usesVueRouter\` | \`boolean\` | \`true\`                    | whether Vue Router is enabled      |

### Usage in a template

\`\`\`hbs
import { httpClient } from '{{alias}}/shared/http/client'
import type { {{Name}} } from '../types/{{name}}.types'

export const {{nameCamel}}Service = {
  async getAll(): Promise<{{Name}}[]> {
    return httpClient.get<{{Name}}[]>('/{{name}}s')
  },
}
\`\`\`

---

## component/ templates

Used by: \`vf generate:component <name>\`

| Variable | Type     | Example (input: "ProductCard") | Description            |
|----------|----------|-------------------------------|------------------------|
| \`name\`   | \`string\` | \`product-card\`                | kebab-case component name |
| \`Name\`   | \`string\` | \`ProductCard\`                 | PascalCase component name |

---

## composable/ templates

Used by: \`vf generate:composable <name>\`

| Variable | Type     | Example (input: "useFilters") | Description              |
|----------|----------|-------------------------------|--------------------------|
| \`name\`   | \`string\` | \`use-filters\`                 | kebab-case composable name |
| \`Name\`   | \`string\` | \`UseFilters\`                  | PascalCase composable name |

---

## Escaping Vue template syntax

Handlebars and Vue both use \`{{ }}\`. To output a Vue expression in your template,
escape the opening braces with a backslash:

\`\`\`hbs
<p>\\{{ item.name }}</p>  {{! outputs: {{ item.name }} in the .vue file }}
\`\`\`

---

## Fallback behaviour

If a template file is absent from this folder, vue-feat-cli falls back to the
built-in default automatically. You only need to include files you actually want
to override — a partial set is perfectly valid.
`

export async function initTemplates() {
  intro('📁 Initializing local templates')

  const root = process.cwd()
  const config = await loadConfig(root)
  const dest = path.resolve(root, config.templatesDir ?? '.vf/templates')

  const safeRoot = path.resolve(root) + path.sep
  if (!dest.startsWith(safeRoot)) {
    log.error(`templatesDir "${config.templatesDir}" resolves outside the project root — aborting.`)
    process.exit(1)
  }

  const alreadyExists = await fs.pathExists(dest) && (await fs.readdir(dest)).length > 0

  if (alreadyExists) {
    const overwrite = await confirm({
      message: `${path.relative(root, dest)} already has files. Overwrite?`,
      initialValue: false,
    })
    if (!overwrite) {
      log.warn('Aborted.')
      process.exit(0)
    }
  }

  await fs.copy(TEMPLATES_DIR, dest, { overwrite: true })
  await fs.writeFile(path.join(dest, 'CONTEXT.md'), CONTEXT_MD, 'utf-8')

  if (!config.templatesDir) {
    const cfg = await fs.readJson(path.join(root, CONFIG_FILENAME)).catch(() => ({ ...defaultConfig }))
    await fs.writeJson(path.join(root, CONFIG_FILENAME), { ...cfg, templatesDir: '.vf/templates' }, { spaces: 2 })
    log.info(`Added "templatesDir": ".vf/templates" to ${CONFIG_FILENAME}`)
  }

  const count = (await fs.readdir(dest, { recursive: true } as Parameters<typeof fs.readdir>[1])).length
  log.info(`CONTEXT.md written — open it to see all available Handlebars variables.`)
  outro(`Copied ${count} template files to ${path.relative(root, dest)}/`)
}

import { intro, log, outro } from '@clack/prompts'
import fs from 'fs-extra'
import path from 'path'
import { loadConfig } from '../config'
import { emitJson, type MachineResult } from '../utils/output'

interface AgentsInitOptions {
  force?: boolean
  json?: boolean
}

function buildAgentsMd(opts: {
  featuresDir: string
  sharedDir: string
  alias: string
  httpClient: string
  usesPinia: boolean
  usesVueRouter: boolean
  usesTanstackQuery: boolean
}): string {
  return `# AGENTS.md — vue-feat-cli conventions

This repo uses \`vue-feat-cli\` (\`vf\`) for feature-based Vue 3 scaffolding.
Follow these conventions when creating or editing features.

## Stack (from vf.config.json)

- features: \`${opts.featuresDir}/\`
- shared: \`${opts.sharedDir}/\`
- alias: \`${opts.alias}\` → \`src/\`
- httpClient: \`${opts.httpClient}\`
- pinia: ${opts.usesPinia ? 'enabled (`defineStore`)' : 'disabled (`reactive()` fallback)'}
- vue-router: ${opts.usesVueRouter ? 'enabled (routes.ts + views/)' : 'disabled'}
- tanstack-query: ${opts.usesTanstackQuery ? 'enabled' : 'disabled'}

## Architecture (strict layering)

\`\`\`
service.ts
  └── useXxxService.ts   ← domain data + CRUD, no UI state
        └── useXxxPage.ts   ← loading + error, delegates to service
              └── XxxView.vue   ← thin page, calls load() on mount
\`\`\`

- \`services/\` uses \`httpClient\` from \`${opts.alias}/shared/http/client\` (\`get/post/put/patch/delete\`), base URL from \`VITE_API_BASE_URL\`.
- \`stores/\` is only for cross-feature shared state.
- \`types/\` holds entity + CreateDto/UpdateDto.
- \`index.ts\` is the public barrel; \`components/\` holds feature-local components.

## CLI contract (prefer non-interactive flags so agents can run headless)

\`\`\`bash
vf doctor --json                        # machine-readable project diagnosis (run first)
vf g:feat Product --dry-run --json      # preview files without writing
vf g:feat Product --json                # scaffold, JSON output { files[], warnings[] }
vf g:feat Order --with-crud --json      # full CRUD service + composables + DTOs
vf g:feat Category --only service,store --json   # partial layers
vf g:feat Category --exclude view,routes --json  # everything except
vf g:feat X --no-store --no-types --json         # convenience negations
vf g:feat X --force --json              # overwrite existing files
vf g:feat X --register-route --json     # also patch src/router/index.ts
vf agents:init --json                   # regenerate this file
\`\`\`

- Layers: \`service, serviceComposable, pageComposable, store, types, index, routes, view\` (+ \`composables\` = both).
- \`--only\` / \`--exclude\` accept comma-separated layers. \`vf.config.json → layers\` can disable layers by default.
- Every generator supports \`--dry-run --json --force\`. In \`--json\` mode stdout is pure JSON; warnings are in \`warnings[]\`.
- Never hand-edit generated barrels inconsistently — re-run the generator or update \`index.ts\`.

## Custom templates

- Override per-project via \`.vf/templates/\` (see \`vf templates:init\` + \`CONTEXT.md\`).
- Variables: feature → \`name, Name, nameCamel, alias, usesVueRouter\`; component/composable → \`name, Name\`.
- Missing local files fall back to built-ins.
`
}

export async function agentsInit(options: AgentsInitOptions = {}) {
  const jsonMode = Boolean(options.json)
  const force = Boolean(options.force)
  const root = process.cwd()
  const config = await loadConfig(root)
  const outPath = path.join(root, 'AGENTS.md')

  if (!jsonMode) intro('🤖 Generating AGENTS.md')

  if ((await fs.pathExists(outPath)) && !force) {
    const msg = 'AGENTS.md already exists (use --force to overwrite).'
    if (jsonMode) {
      emitJson({ command: 'agents:init', ok: false, dryRun: false, files: [], warnings: [], error: msg })
      process.exit(1)
    }
    log.error(msg)
    process.exit(1)
  }

  const content = buildAgentsMd({
    featuresDir: config.featuresDir,
    sharedDir: config.sharedDir,
    alias: config.alias,
    httpClient: config.httpClient,
    usesPinia: config.usesPinia,
    usesVueRouter: config.usesVueRouter,
    usesTanstackQuery: config.usesTanstackQuery,
  })

  await fs.writeFile(outPath, content, 'utf-8')
  const rel = path.relative(root, outPath)
  const result: MachineResult = {
    command: 'agents:init',
    ok: true,
    dryRun: false,
    files: [{ template: 'agents-md', path: rel, status: 'created' }],
    warnings: [],
  }

  if (jsonMode) emitJson(result)
  else outro(`Created: ${rel} — commit it so every agent follows the same conventions.`)
  return result
}

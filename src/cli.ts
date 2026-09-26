import { cac } from 'cac'
import { agentsInit } from './commands/agents-init'
import { doctor } from './commands/doctor'
import { generateComponent } from './commands/generate-component'
import { generateComposable } from './commands/generate-composable'
import { generateFeat } from './commands/generate-feat'
import { generateService } from './commands/generate-service'
import { generateStore } from './commands/generate-store'
import { help } from './commands/help'
import { init } from './commands/init'
import { initTemplates } from './commands/init-templates'

const cli = cac('vf')

cli
  .command('generate:feat <name>', 'Scaffold a complete feature module')
  .alias('g:feat')
  .option('--with-crud', 'Generate full CRUD methods in service and composables')
  .option('--register-route', 'Auto-register the route in the router file (requires usesVueRouter: true)')
  .option('--only <layers>', 'Comma-separated layers to generate (e.g. service,store). Overrides defaults.')
  .option('--exclude <layers>', 'Comma-separated layers to skip')
  .option('--no-store', 'Skip the store layer')
  .option('--no-types', 'Skip the types layer')
  .option('--no-service', 'Skip the service layer')
  .option('--no-composables', 'Skip both service + page composables')
  .option('--no-view', 'Skip the view layer')
  .option('--no-routes', 'Skip the routes layer')
  .option('--no-index', 'Skip the barrel index.ts')
  .option('--dry-run', 'Preview files without writing')
  .option('--json', 'Machine-readable JSON output (pure stdout, for agents/CI)')
  .option('--force', 'Overwrite existing files')
  .action(generateFeat)

cli
  .command('generate:composable <name>', 'Create a composable inside a feature')
  .alias('g:composable')
  .option('--feature <feature>', 'Feature to attach this to')
  .option('--dry-run', 'Preview files without writing')
  .option('--json', 'Machine-readable JSON output')
  .option('--force', 'Overwrite existing files')
  .action(generateComposable)

cli
  .command('generate:service <name>', 'Create a service inside a feature')
  .alias('g:service')
  .option('--feature <feature>', 'Feature to attach this to')
  .option('--dry-run', 'Preview files without writing')
  .option('--json', 'Machine-readable JSON output')
  .option('--force', 'Overwrite existing files')
  .action(generateService)

cli
  .command('generate:component <name>', 'Create a component')
  .alias('g:component')
  .option('--feature <feature>', 'Feature to attach this to (omit for shared)')
  .option('--dry-run', 'Preview files without writing')
  .option('--json', 'Machine-readable JSON output')
  .option('--force', 'Overwrite existing files')
  .action(generateComponent)

cli
  .command('generate:store <name>', 'Create a Pinia store inside a feature')
  .alias('g:store')
  .option('--feature <feature>', 'Feature to attach this to')
  .option('--dry-run', 'Preview files without writing')
  .option('--json', 'Machine-readable JSON output')
  .option('--force', 'Overwrite existing files')
  .action(generateStore)

cli
  .command('init', 'Configura o vue-feat-cli no projeto atual')
  .option('--yes', 'Accept all detected defaults without prompting (useful for CI)')
  .action(init)

cli
  .command('templates:init', 'Copy default templates to .vf/templates/ for local customization')
  .action(initTemplates)

cli
  .command('doctor', 'Diagnose project config, deps and scaffolding readiness')
  .option('--json', 'Machine-readable JSON output')
  .action(doctor)

cli
  .command('agents:init', 'Generate AGENTS.md with conventions for AI agents')
  .option('--force', 'Overwrite existing AGENTS.md')
  .option('--json', 'Machine-readable JSON output')
  .action(agentsInit)

cli
  .command('help [command]', 'Show detailed help for a command')
  .action(help)

cli.help()
cli.version('26.9.0')
cli.parse()

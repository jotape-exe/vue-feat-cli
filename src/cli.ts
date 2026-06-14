import { cac } from 'cac'
import { generateComponent } from './commands/generate-component'
import { generateComposable } from './commands/generate-composable'
import { generateFeat } from './commands/generate-feat'
import { generateService } from './commands/generate-service'
import { generateStore } from './commands/generate-store'
import { init } from './commands/init'
import { initTemplates } from './commands/init-templates'

const cli = cac('vf')

cli
  .command('generate:feat <name>', 'Scaffold a complete feature module')
  .alias('g:feat')
  .option('--with-crud', 'Generate full CRUD methods in service and composables')
  .option('--register-route', 'Auto-register the route in the router file (requires usesVueRouter: true)')
  .action(generateFeat)

cli
  .command('generate:composable <name>', 'Create a composable inside a feature')
  .alias('g:composable')
  .option('--feature <feature>', 'Feature to attach this to')
  .action(generateComposable)

cli
  .command('generate:service <name>', 'Create a service inside a feature')
  .alias('g:service')
  .option('--feature <feature>', 'Feature to attach this to')
  .action(generateService)

cli
  .command('generate:component <name>', 'Create a component')
  .alias('g:component')
  .option('--feature <feature>', 'Feature to attach this to (omit for shared)')
  .action(generateComponent)

cli
  .command('generate:store <name>', 'Create a Pinia store inside a feature')
  .alias('g:store')
  .option('--feature <feature>', 'Feature to attach this to')
  .action(generateStore)

cli
  .command('init', 'Configura o vue-feat-cli no projeto atual')
  .option('--yes', 'Accept all detected defaults without prompting (useful for CI)')
  .action(init)

cli
  .command('templates:init', 'Copy default templates to .vf/templates/ for local customization')
  .action(initTemplates)

cli.help()
cli.version('0.1.0')
cli.parse()
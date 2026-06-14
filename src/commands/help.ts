import { isCancel, select } from '@clack/prompts'
import { COMMAND_ALIASES, COMMAND_DOCS, type CommandDoc } from '../data/help-data'

const b = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

function resolveDoc(name: string): CommandDoc | undefined {
  const canonical = COMMAND_ALIASES[name] ?? name
  return COMMAND_DOCS[canonical]
}

function printCommandDoc(doc: CommandDoc): void {
  console.log()
  console.log(`  ${b(doc.name)}${doc.alias ? `  ${dim(`alias: ${doc.alias}`)}` : ''}`)
  console.log()
  console.log(`  ${doc.longDescription}`)
  console.log()

  console.log(`  ${b('Usage')}`)
  console.log(`    ${cyan(doc.usage)}`)
  console.log()

  if (doc.options.length > 0) {
    console.log(`  ${b('Options')}`)
    for (const opt of doc.options) {
      console.log(`    ${yellow(opt.flag.padEnd(26))}  ${opt.description}`)
      if (opt.note) {
        console.log(`    ${''.padEnd(28)}${dim(opt.note)}`)
      }
    }
    console.log()
  }

  console.log(`  ${b('Examples')}`)
  for (const ex of doc.examples) {
    console.log(`    ${green('$')} ${ex.cmd}`)
    console.log(`      ${dim(ex.note)}`)
  }
  console.log()

  if (doc.related.length > 0) {
    console.log(`  ${b('See also')}  ${doc.related.map(cyan).join('  ')}`)
    console.log()
  }
}

function printOverview(): void {
  console.log()
  console.log(`  ${b('vue-feat-cli')}  ${dim('— opinionated Vue 3 feature scaffolder')}`)
  console.log()
  console.log(`  ${b('Commands')}`)

  for (const doc of Object.values(COMMAND_DOCS)) {
    const padded = doc.name.length + (doc.alias ? doc.alias.length + 3 : 0)
    const gap = ' '.repeat(Math.max(2, 36 - padded))
    console.log(`    ${cyan(doc.name)}${doc.alias ? `  ${dim(`(${doc.alias})`)}` : ''}${gap}${doc.description}`)
  }

  console.log()
  console.log(`  ${dim('Run')} ${cyan('vf help <command>')} ${dim('for detailed usage and examples.')}`)
  console.log()
}

export async function help(command?: string): Promise<void> {
  if (command) {
    const doc = resolveDoc(command)
    if (!doc) {
      console.log()
      console.log(`  ${b('Unknown command:')} "${command}"`)
      console.log(`  Run ${cyan('vf help')} to see all available commands.`)
      console.log()
      process.exit(1)
    }
    printCommandDoc(doc)
    return
  }

  printOverview()

  console.log(`  ${dim('Use')} ${dim('↑↓')} ${dim('to navigate,')} ${dim('Enter')} ${dim('to select,')} ${dim('Esc')} ${dim('to exit.')}`)
  console.log()

  const choice = await select({
    message: 'Open detailed help for a command?',
    options: [
      ...Object.values(COMMAND_DOCS).map((d) => ({
        value: d.name,
        label: d.name,
        hint: d.alias ?? undefined,
      })),
      { value: '__exit__', label: 'Exit' },
    ],
  })

  if (isCancel(choice) || choice === '__exit__') {
    console.log()
    return
  }

  const doc = COMMAND_DOCS[choice as string]
  if (doc) printCommandDoc(doc)
}

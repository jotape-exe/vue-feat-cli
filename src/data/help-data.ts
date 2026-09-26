export interface OptionDoc {
  flag: string
  description: string
  note?: string
}

export interface ExampleDoc {
  cmd: string
  note: string
}

export interface CommandDoc {
  name: string
  alias?: string
  description: string
  longDescription: string
  usage: string
  options: OptionDoc[]
  examples: ExampleDoc[]
  related: string[]
}

export const COMMAND_DOCS: Record<string, CommandDoc> = {
  init: {
    name: 'init',
    description: 'Configure vue-feat-cli in the current project',
    longDescription:
      'Detects installed dependencies (Pinia, Vue Router, Axios, TanStack Query) and the TypeScript path alias from tsconfig.json. Saves preferences to vf.config.json and creates the HTTP client at src/shared/http/client.ts. All subsequent generators read this file.',
    usage: 'vf init [options]',
    options: [
      {
        flag: '--yes',
        description: 'Accept all detected defaults without interactive prompts.',
        note: 'Useful for CI/CD — uses detected dependencies as the answer to each question.',
      },
    ],
    examples: [
      { cmd: 'vf init', note: 'Interactive mode — detects and confirms each setting' },
      { cmd: 'vf init --yes', note: 'Accept everything automatically, no prompts' },
    ],
    related: ['templates:init'],
  },

  'generate:feat': {
    name: 'generate:feat',
    alias: 'g:feat',
    description: 'Scaffold a complete feature module',
    longDescription:
      'Generates the full structure of a feature (service, composables, store, types, barrel export and, when Vue Router is enabled, view and routes). Behavior is driven by vf.config.json — Pinia uses defineStore, without a router routes.ts and views/ are omitted. Layers can be trimmed per-run with --only/--exclude/--no-* or per-project with config.layers. Every run supports --dry-run (preview) and --json (pure-JSON stdout for agents).',
    usage: 'vf generate:feat <name> [options]',
    options: [
      {
        flag: '--with-crud',
        description: 'Generate full CRUD methods (list, getById, create, update, delete) in the service and composables.',
        note: 'Also expands types with CreateDto and UpdateDto.',
      },
      {
        flag: '--register-route',
        description: 'Auto-register the feature route in the router (inserts import + spread into the routes array).',
        note: 'Requires usesVueRouter: true in vf.config.json and src/router/index.ts to exist.',
      },
      {
        flag: '--only <layers>',
        description: 'Only generate these layers (comma-separated).',
        note: 'Layers: service, serviceComposable, pageComposable, store, types, index, routes, view (composables = both).',
      },
      {
        flag: '--exclude <layers>',
        description: 'Skip these layers (comma-separated, same layer names as --only).',
      },
      {
        flag: '--no-store / --no-types / --no-service / --no-composables / --no-view / --no-routes / --no-index',
        description: 'Convenience negations for a single layer.',
      },
      {
        flag: '--dry-run',
        description: 'Preview planned files without writing anything.',
      },
      {
        flag: '--json',
        description: 'Emit pure JSON { files[], warnings[] } on stdout (no spinners).',
        note: 'Combine with --dry-run for agent previews.',
      },
      {
        flag: '--force',
        description: 'Overwrite existing files instead of failing.',
      },
    ],
    examples: [
      { cmd: 'vf g:feat Product', note: 'Basic feature without CRUD' },
      { cmd: 'vf g:feat Order --with-crud', note: 'Feature with full CRUD methods' },
      { cmd: 'vf g:feat Category --with-crud --register-route', note: 'CRUD + route auto-registered in the router' },
      { cmd: 'vf g:feat Billing --only service,store --json', note: 'Partial feature (agent-friendly)' },
      { cmd: 'vf g:feat Billing --dry-run --json', note: 'Preview without writing' },
      { cmd: 'vf generate:feat UserProfile', note: 'Using the full command (equivalent to the alias)' },
    ],
    related: ['generate:service', 'generate:store', 'generate:composable', 'doctor', 'agents:init'],
  },

  'generate:composable': {
    name: 'generate:composable',
    alias: 'g:composable',
    description: 'Create a composable inside a feature or in shared',
    longDescription:
      'Generates a TypeScript composable. If --feature is omitted, an interactive prompt lists existing features to choose from. Skipping the selection places the composable in src/shared/composables/. Supports --dry-run/--json/--force.',
    usage: 'vf generate:composable <name> [options]',
    options: [
      {
        flag: '--feature <feature>',
        description: 'Target feature for the composable.',
        note: 'If omitted, the prompt lists available features. Leave blank to create in src/shared/composables/.',
      },
      { flag: '--dry-run', description: 'Preview without writing.' },
      { flag: '--json', description: 'Pure-JSON output for agents.' },
      { flag: '--force', description: 'Overwrite existing files.' },
    ],
    examples: [
      { cmd: 'vf g:composable useFilters --feature product', note: 'Composable inside the product feature' },
      { cmd: 'vf g:composable useTheme', note: 'Interactive prompt to choose the target' },
      { cmd: 'vf g:composable usePagination --feature order', note: 'Composable in the order feature' },
    ],
    related: ['generate:feat', 'generate:service'],
  },

  'generate:service': {
    name: 'generate:service',
    alias: 'g:service',
    description: 'Create a service inside an existing feature',
    longDescription:
      'Adds a service file and its types file to an existing feature. Ensures the HTTP client is present at src/shared/http/client.ts before creating the service. Supports --dry-run/--json/--force.',
    usage: 'vf generate:service <name> [options]',
    options: [
      {
        flag: '--feature <feature>',
        description: 'Target feature (prompted interactively if omitted).',
      },
      { flag: '--dry-run', description: 'Preview without writing.' },
      { flag: '--json', description: 'Pure-JSON output for agents.' },
      { flag: '--force', description: 'Overwrite existing files.' },
    ],
    examples: [
      { cmd: 'vf g:service product --feature product', note: 'Add a service to the product feature' },
      { cmd: 'vf g:service auth --feature user', note: 'Auth service inside the user feature' },
    ],
    related: ['generate:feat', 'generate:store'],
  },

  'generate:component': {
    name: 'generate:component',
    alias: 'g:component',
    description: 'Create a Vue component inside a feature or in shared',
    longDescription:
      'Generates a single-file component (.vue). Supports nested paths in the name to create subdirectories automatically. If --feature is omitted, the component is placed in src/shared/components/. Supports --dry-run/--json/--force.',
    usage: 'vf generate:component <name> [options]',
    options: [
      {
        flag: '--feature <feature>',
        description: 'Target feature. If omitted, the component is created in src/shared/components/.',
      },
      { flag: '--dry-run', description: 'Preview without writing.' },
      { flag: '--json', description: 'Pure-JSON output for agents.' },
      { flag: '--force', description: 'Overwrite existing files.' },
    ],
    examples: [
      { cmd: 'vf g:component ProductCard --feature product', note: 'Component inside the product feature' },
      { cmd: 'vf g:component cards/ProductCard', note: 'Nested path creates a cards/ subdirectory' },
      { cmd: 'vf g:component BaseButton', note: 'Shared component in src/shared/components/' },
    ],
    related: ['generate:feat', 'generate:composable'],
  },

  'generate:store': {
    name: 'generate:store',
    alias: 'g:store',
    description: 'Create a store inside an existing feature',
    longDescription:
      'Adds a store to an existing feature. Uses defineStore (Pinia) when usesPinia: true in vf.config.json, or reactive() as a fallback when Pinia is not configured. Supports --dry-run/--json/--force.',
    usage: 'vf generate:store <name> [options]',
    options: [
      {
        flag: '--feature <feature>',
        description: 'Target feature (prompted interactively if omitted).',
      },
      { flag: '--dry-run', description: 'Preview without writing.' },
      { flag: '--json', description: 'Pure-JSON output for agents.' },
      { flag: '--force', description: 'Overwrite existing files.' },
    ],
    examples: [
      { cmd: 'vf g:store product --feature product', note: 'Pinia store for the product feature' },
      { cmd: 'vf g:store cart --feature checkout', note: 'Store for the checkout feature' },
    ],
    related: ['generate:feat', 'generate:service'],
  },

  'templates:init': {
    name: 'templates:init',
    description: 'Copy default templates to .vf/templates/ for local customization',
    longDescription:
      'Exports all built-in Handlebars templates to .vf/templates/, allowing per-project code generation customization. Creates CONTEXT.md with documentation for all available template variables. Updates vf.config.json with templatesDir if not already set.',
    usage: 'vf templates:init',
    options: [],
    examples: [
      { cmd: 'vf templates:init', note: 'Copy all templates to .vf/templates/' },
    ],
    related: ['init'],
  },

  doctor: {
    name: 'doctor',
    description: 'Diagnose project config, deps and scaffolding readiness',
    longDescription:
      'Checks vf.config.json, required directories, tsconfig alias, installed deps vs config (Pinia, Vue Router, TanStack Query, axios), the shared http client and router file. Emits the built-in template inventory and variable names. Use --json for agent consumption.',
    usage: 'vf doctor [--json]',
    options: [{ flag: '--json', description: 'Pure-JSON output with checks[], config and templates.' }],
    examples: [
      { cmd: 'vf doctor', note: 'Human-readable diagnosis' },
      { cmd: 'vf doctor --json', note: 'Machine-readable diagnosis for agents/CI' },
    ],
    related: ['init', 'generate:feat'],
  },

  'agents:init': {
    name: 'agents:init',
    description: 'Generate AGENTS.md with conventions for AI agents',
    longDescription:
      'Writes AGENTS.md at the project root with stack (from vf.config.json), layering rules, CLI contract (--dry-run/--json/--force, --only/--exclude) and template variables. Commit it so every agent follows the same conventions.',
    usage: 'vf agents:init [--force] [--json]',
    options: [
      { flag: '--force', description: 'Overwrite existing AGENTS.md.' },
      { flag: '--json', description: 'Pure-JSON output for agents.' },
    ],
    examples: [
      { cmd: 'vf agents:init', note: 'Generate AGENTS.md' },
      { cmd: 'vf agents:init --force', note: 'Regenerate after changing vf.config.json' },
    ],
    related: ['doctor', 'generate:feat'],
  },
}

export const COMMAND_ALIASES: Record<string, string> = {
  'g:feat': 'generate:feat',
  'g:composable': 'generate:composable',
  'g:service': 'generate:service',
  'g:component': 'generate:component',
  'g:store': 'generate:store',
}

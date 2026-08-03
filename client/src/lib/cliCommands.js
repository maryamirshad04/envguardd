export const AUTH_COMMANDS = [
  { cmd: 'envguard login', desc: 'Authenticate with your EnvGuard account' },
  { cmd: 'envguard logout', desc: 'Log out and remove the stored session' },
  { cmd: 'envguard whoami', desc: 'Show the currently authenticated user' },
];

export const COMPANY_COMMANDS = [
  { cmd: 'envguard company list', desc: 'List all teams you belong to' },
  { cmd: 'envguard company select <name>', desc: 'Select a team to work in' },
  { cmd: 'envguard company current', desc: 'Show the currently selected team' },
];

export const PROJECT_COMMANDS = [
  { cmd: 'envguard project list', desc: 'List projects in the selected team' },
  { cmd: 'envguard project select <name>', desc: 'Select a project' },
  { cmd: 'envguard project current', desc: 'Show the currently selected project' },
];

export const ENV_COMMANDS = [
  { cmd: 'envguard environment list', desc: 'List environments in the selected project' },
  { cmd: 'envguard environment select <name>', desc: 'Select an environment' },
  { cmd: 'envguard environment current', desc: 'Show the currently selected environment' },
];

export const VARIABLE_COMMANDS = [
  { cmd: 'envguard variable list', desc: 'List variables in the selected environment' },
  { cmd: 'envguard variable get <key>', desc: 'Display a single variable' },
  { cmd: 'envguard variable set <key> <value>', desc: 'Create or update a variable' },
  { cmd: 'envguard variable set <key> <value> --secret', desc: 'Create or update a protected variable' },
  { cmd: 'envguard variable set <key> <value> --env <name>', desc: "Set a variable in a specific environment, overriding the selected one" },
  { cmd: 'envguard variable delete <key>', desc: 'Delete a variable' },
  { cmd: 'envguard variable delete <key> --env <name>', desc: 'Delete a variable from a specific environment' },
  { cmd: 'envguard variable reveal <key>', desc: "Reveal a protected variable's value" },
  { cmd: 'envguard variable copy <key>', desc: "Copy a variable's value to the clipboard" },
  { cmd: 'envguard variable copy-all', desc: 'Copy all variables in the selected environment' },
  { cmd: 'envguard variable copy-all --env <name>', desc: 'Copy all variables from a specific environment' },
  { cmd: 'envguard variable export', desc: 'Print .env-formatted output to the terminal' },
  { cmd: 'envguard variable export --file .env', desc: 'Export variables to a file' },
  { cmd: 'envguard variable export --env <name> --file .env.<name>', desc: 'Export a specific environment to a specific file' },
  { cmd: 'envguard variable import <file>', desc: 'Import variables from a .env file' },
  { cmd: 'envguard variable import .env --env <name> --create', desc: "Import into an environment, creating it if it doesn't exist" },
  { cmd: 'envguard variable import .env --env <name> --create --secret-keys "<key>"', desc: 'Create the environment if missing and mark specific keys as protected' },
  { cmd: 'envguard variable import .env --env <name> --secret', desc: 'Mark every imported variable as protected' },
  { cmd: 'envguard variable import .env --secret-keys "<key1>,<key2>,<key3>"', desc: 'Mark only specific keys as protected' },
  { cmd: 'envguard variable import .env --env production --skip-existing', desc: 'Skip keys that already exist in the target environment' },
];

export const GLOBAL_OPTIONS = [
  { cmd: '--help', desc: 'Show help for any command' },
  { cmd: '--version', desc: 'Show the installed CLI version' },
];

export const WORKFLOW = [
  'envguard login',
  'envguard company select personal',
  'envguard project select backend',
  'envguard environment select production',
  'envguard variable list',
  'envguard variable reveal DATABASE_URL',
  'envguard variable export --file .env',
];

export const VSCODE_STEPS = [
  ['Open the integrated terminal', 'View → Terminal, or Ctrl+` (Cmd+` on macOS).'],
  ['Install once, globally', 'npm install -g envguard-secrets, then available in every project\u2019s terminal.'],
  ['Log in and select your project', 'envguard login, then company / project / environment select.'],
  ['Pull variables into a local .env', 'envguard variable export --file .env, keep .env in your .gitignore.'],
];
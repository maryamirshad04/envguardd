'use client';

import Link from 'next/link';
import CommandLine from '@/components/Cli/CommandLine';
import CommandGroup from '@/components/Cli/CommandGroup';

function TerminalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 9l4 3-4 3M13 15h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const AUTH_COMMANDS = [
  { cmd: 'envguard login', desc: 'Authenticate with your EnvGuard account' },
  { cmd: 'envguard logout', desc: 'Log out and remove the stored session' },
  { cmd: 'envguard whoami', desc: 'Show the currently authenticated user' },
];

const COMPANY_COMMANDS = [
  { cmd: 'envguard company list', desc: 'List all teams you belong to' },
  { cmd: 'envguard company select <name>', desc: 'Select a team to work in' },
  { cmd: 'envguard company current', desc: 'Show the currently selected team' },
];

const PROJECT_COMMANDS = [
  { cmd: 'envguard project list', desc: 'List projects in the selected team' },
  { cmd: 'envguard project select <name>', desc: 'Select a project' },
  { cmd: 'envguard project current', desc: 'Show the currently selected project' },
];

const ENV_COMMANDS = [
  { cmd: 'envguard environment list', desc: 'List environments in the selected project' },
  { cmd: 'envguard environment select <name>', desc: 'Select an environment' },
  { cmd: 'envguard environment current', desc: 'Show the currently selected environment' },
];

const VARIABLE_COMMANDS = [
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

const GLOBAL_OPTIONS = [
  { cmd: '--help', desc: 'Show help for any command' },
  { cmd: '--version', desc: 'Show the installed CLI version' },
];

const WORKFLOW = [
  'envguard login',
  'envguard company select personal',
  'envguard project select backend',
  'envguard environment select production',
  'envguard variable list',
  'envguard variable reveal DATABASE_URL',
  'envguard variable export --file .env',
];

const VSCODE_STEPS = [
  ['Open the integrated terminal', 'View → Terminal, or Ctrl+` (Cmd+` on macOS).'],
  ['Install once, globally', 'npm install -g envguard-secrets then available in every project\u2019s terminal.'],
  ['Log in and select your project', 'envguard login, then company / project / environment select.'],
  ['Pull variables into a local .env', 'envguard variable export --file .env keep .env in your .gitignore.'],
];

export default function CliPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-mist hover:text-paper">
        &larr; Dashboard
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-signal">
          <TerminalIcon />
        </span>
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-signal">CLI</p>
          <h1 className="mt-1 text-2xl font-semibold text-paper sm:text-3xl">
            Manage secrets without leaving the terminal
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Authenticate once, then list, reveal, and sync environment variables directly from a
            terminal, including the one built into VS Code.
          </p>
        </div>
      </div>

      {/* Quick install */}
      <div className="mt-8 rounded-sm border border-line bg-surface p-5">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Quick install</p>
        <div className="mt-3 space-y-2">
          <CommandLine>npm install -g envguard-secrets</CommandLine>
          <CommandLine>envguard login</CommandLine>
        </div>
        <p className="mt-3 text-xs text-mist">
          Requires Node.js and npm. Log in with the same account you use on this dashboard.
        </p>
      </div>

      {/* VS Code */}
      <section className="mt-10">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Using it in VS Code</p>
        <h2 className="mt-1 text-lg font-medium text-paper">No extension needed, it's your terminal</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          The CLI is a regular npm package, so VS Code's built-in terminal runs it exactly like any
          other command-line tool.
        </p>
        <ol className="mt-4 space-y-3">
          {VSCODE_STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3 rounded-sm border border-line bg-surface p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal/15 font-mono text-xs text-signal">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-paper">{title}</p>
                <p className="mt-1 text-xs text-mist">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Setup */}
      <section className="mt-10">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Setup (optional)</p>
        <h2 className="mt-1 text-lg font-medium text-paper">Point it at your own deployment</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          By default the CLI talks to the hosted EnvGuard backend. Self-hosting? Point it elsewhere:
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1 text-xs text-mist">Linux / macOS</p>
            <CommandLine>export ENVGUARD_API_URL=https://your-backend/api</CommandLine>
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs text-mist">Windows PowerShell</p>
            <CommandLine>{'$env:ENVGUARD_API_URL="https://your-backend/api"'}</CommandLine>
          </div>
        </div>
      </section>

      {/* Command reference */}
      <section className="mt-10">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Command reference</p>
        <h2 className="mt-1 text-lg font-medium text-paper">Every command, grouped by what it touches</h2>

        <CommandGroup title="Authentication" commands={AUTH_COMMANDS} />
        <CommandGroup
          title="Team"
          commands={COMPANY_COMMANDS}
          note='Called "company" in the CLI, "team" in the dashboard, same thing.'
        />
        <CommandGroup title="Project" commands={PROJECT_COMMANDS} />
        <CommandGroup title="Environment" commands={ENV_COMMANDS} />
        <CommandGroup title="Variables" commands={VARIABLE_COMMANDS} />
        <CommandGroup title="Global options" commands={GLOBAL_OPTIONS} />
      </section>

      {/* Example workflow */}
      <section className="mb-4 mt-10">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Example workflow</p>
        <h2 className="mt-1 text-lg font-medium text-paper">
          From install to a decrypted value, in under a minute
        </h2>
        <div className="mt-3 space-y-2 overflow-x-auto rounded-sm border border-line bg-ink p-4">
          {WORKFLOW.map((line) => (
            <p key={line} className="whitespace-pre font-mono text-sm text-paper">
              <span className="select-none text-signal">$ </span>
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
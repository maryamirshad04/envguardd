'use client';

import Link from 'next/link';
import CommandLine from '@/components/Cli/CommandLine';
import CommandGroup from '@/components/Cli/CommandGroup';
import {
  AUTH_COMMANDS,
  COMPANY_COMMANDS,
  PROJECT_COMMANDS,
  ENV_COMMANDS,
  VARIABLE_COMMANDS,
  GLOBAL_OPTIONS,
  WORKFLOW,
  VSCODE_STEPS,
} from '@/lib/cliCommands';

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

export default function CliPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
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
          <p className="mt-2 max-w-xl text-md leading-relaxed text-mist">
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
          note='Called "company" in the CLI, "team" in the dashboard same thing.'
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
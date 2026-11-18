#!/usr/bin/env node
const { program } = require('commander');
const pkg = require('../package.json');

program.version(pkg.version);

// Login / logout / whoami 
program
  .command('login')
  .description('Log in to EnvGuard')
  .action(require('./commands/login'));

program
  .command('logout')
  .description('Log out')
  .action(require('./commands/logout'));

program
  .command('whoami')
  .description('Show current user')
  .action(require('./commands/whoami'));

// Company 
const company = program.command('company').description('Manage companies');
company
  .command('list')
  .description('List companies')
  .action(require('./commands/company/list'));
company
  .command('select <slug>')
  .description('Select a company')
  .action(require('./commands/company/select'));
company
  .command('current')
  .description('Show selected company')
  .action(require('./commands/company/current'));

// Project 
const project = program.command('project').description('Manage projects');
project
  .command('list')
  .description('List projects in the selected company')
  .action(require('./commands/project/list'));
project
  .command('select <slug>')
  .description('Select a project')
  .action(require('./commands/project/select'));
project
  .command('current')
  .description('Show selected project')
  .action(require('./commands/project/current'));

// Environment 
const environment = program.command('environment').description('Manage environments');
environment
  .command('list')
  .description('List environments in the selected project')
  .action(require('./commands/environment/list'));
environment
  .command('select <name>')
  .description('Select an environment by name')
  .action(require('./commands/environment/select'));
environment
  .command('current')
  .description('Show selected environment')
  .action(require('./commands/environment/current'));

// Variable 
const variable = program.command('variable').description('Manage environment variables');
variable
  .command('list')
  .description('List variables in an environment (uses selected environment if --env omitted)')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/list'));

variable
  .command('set <key> <value>')
  .description('Set a variable (overwrites if exists)')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .option('--secret', 'Mark as secret (value hidden in logs)')
  .action(require('./commands/variable/set'));

variable
  .command('get <key>')
  .description('Get a specific variable value (masks secrets)')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/get'));

variable
  .command('delete <key>')
  .description('Delete a variable')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/delete'));

variable
  .command('reveal <key>')
  .description('Reveal the value of a variable (including secrets)')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/reveal'));

variable
  .command('copy <key>')
  .description('Copy the value of a variable to clipboard')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/copy'));

variable
  .command('copy-all')
  .description('Copy all variables (KEY=value) to clipboard')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .action(require('./commands/variable/copy-all'));

variable
  .command('export')
  .description('Export variables in .env format (print to stdout or save to file)')
  .option('--env <id|name>', 'Environment ID or name (overrides selected)')
  .option('--file <path>', 'Save to file instead of printing')
  .action(require('./commands/variable/export'));

variable
  .command('import <file>')
  .description('Import variables from a .env file into an environment')
  .option('--env <name>', 'Environment name (overrides selected)')
  .option('--create', 'Create environment if it does not exist')
  .option('--secret', 'Mark all imported variables as secret')
  .option('--secret-keys <keys>', 'Comma-separated list of keys to mark as secret')
  .option('--skip-existing', 'Skip variables that already exist in the environment')
  .option('--dry-run', 'Preview the import without actually saving')
  .action(require('./commands/variable/import'));

program.parse(process.argv);
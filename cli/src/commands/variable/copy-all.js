const api = require('../../api');
const config = require('../../config');
const clipboardy = require('clipboardy');
const inquirer = require('inquirer');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function copyAllVariables(options) {
  try {
    const company = config.getSelectedCompany();
    const project = config.getSelectedProject();

    if (!company || !project) {
      console.error('Please select a company and project first.');
      return;
    }

    let envId = options.env || config.getSelectedEnvironment();
    if (!envId) {
      console.error('No environment selected. Use `envguard environment select <name>` or provide --env.');
      return;
    }

    const resolvedEnvId = await resolveEnvironmentId(company, project, envId);
    if (!resolvedEnvId) {
      console.error(`Environment "${envId}" not found.`);
      return;
    }

    const res = await api.get(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`);
    let variables = res.data;
    if (!Array.isArray(variables)) variables = variables.variables || variables.data || [];

    if (variables.length === 0) {
      console.log('No variables to copy.');
      return;
    }

    // Build .env content
    const lines = variables.map(v => `${v.key}=${v.value}`);
    const content = lines.join('\n');

    // Warn if there are secrets
    const hasSecrets = variables.some(v => v.is_secret);
    if (hasSecrets) {
      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: '⚠️  This environment contains secrets. Copy all values (including secrets) to clipboard?',
        default: false,
      });
      if (!confirm) {
        console.log('Copy cancelled.');
        return;
      }
    }

    clipboardy.writeSync(content);
    console.log(`✅ ${variables.length} variables copied to clipboard.`);
  } catch (err) {
    console.error('Failed to copy variables:', err.response?.data?.error || err.message);
  }
};
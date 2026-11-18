const api = require('../../api');
const config = require('../../config');
const clipboardy = require('clipboardy');
const inquirer = require('inquirer');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function copyVariable(key, options) {
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

    // Fetch all variables
    const res = await api.get(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`);
    let variables = res.data;
    if (!Array.isArray(variables)) variables = variables.variables || variables.data || [];

    const variable = variables.find(v => v.key === key);
    if (!variable) {
      console.error(`Variable "${key}" not found.`);
      return;
    }

    let value = variable.value;

    // If secret, ask for confirmation
    if (variable.is_secret) {
      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `⚠️  "${key}" is a secret. Copy its value to clipboard?`,
        default: false,
      });
      if (!confirm) {
        console.log('Copy cancelled.');
        return;
      }
    }

    clipboardy.writeSync(value);
    console.log(`✅ Value of "${key}" copied to clipboard.`);
  } catch (err) {
    console.error('Failed to copy variable:', err.response?.data?.error || err.message);
  }
};
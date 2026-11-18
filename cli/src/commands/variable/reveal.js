const api = require('../../api');
const config = require('../../config');
const inquirer = require('inquirer');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function revealVariable(key, options) {
  try {
    const company = config.getSelectedCompany();
    const project = config.getSelectedProject();

    if (!company || !project) {
      console.error('Please select a company and project first.');
      return;
    }

    let envId = options.env || config.getSelectedEnvironment();
    if (!envId) {
      console.error('No environment selected. Use `envguard environment select <name>` or provide --env <id|name>.');
      return;
    }

    const resolvedEnvId = await resolveEnvironmentId(company, project, envId);
    if (!resolvedEnvId) {
      console.error(`Environment "${envId}" not found.`);
      return;
    }

    const listRes = await api.get(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`);
    let variables = listRes.data;
    if (!Array.isArray(variables)) variables = variables.variables || variables.data || [];
    const variable = variables.find(v => v.key === key);

    if (!variable) {
      console.error(`Variable "${key}" not found.`);
      return;
    }

    if (!variable.is_secret) {
      console.log(`${variable.key} = ${variable.value}`);
      return;
    }

    // Secret: confirm before revealing
    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `⚠️  "${key}" is a secret. Reveal its value?`,
      default: false,
    });

    if (!confirm) {
      console.log('Reveal cancelled.');
      return;
    }

    // Since the server returns the actual value for authenticated users, we just print it.
    console.log(`${variable.key} = ${variable.value}`);
  } catch (err) {
    console.error('Failed to reveal variable:', err.response?.data?.error || err.message);
  }
};
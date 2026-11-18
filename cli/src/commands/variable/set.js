const api = require('../../api');
const config = require('../../config');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function setVariable(key, value, options) {
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

    const isSecret = options.secret || false;

    await api.post(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`, {
      key,
      value,
      is_secret: isSecret,
    });

    console.log(`✅ Variable "${key}" saved successfully.`);
  } catch (err) {
    console.error('Failed to set variable:', err.response?.data?.error || err.message);
  }
};
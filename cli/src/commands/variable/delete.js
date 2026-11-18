const api = require('../../api');
const config = require('../../config');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function deleteVariable(key, options) {
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

    // 1. Fetch all variables to get the ID of the one we want to delete
    const listRes = await api.get(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`);
    let variables = listRes.data;
    if (!Array.isArray(variables)) variables = variables.variables || variables.data || [];
    const variable = variables.find(v => v.key === key);

    if (!variable) {
      console.error(`Variable "${key}" not found in environment ${envId}.`);
      return;
    }

    // 2. Delete by ID
    await api.delete(
      `/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables/${variable.id}`
    );

    console.log(`✅ Variable "${key}" deleted successfully.`);
  } catch (err) {
    console.error('Failed to delete variable:', err.response?.data?.error || err.message);
  }
};
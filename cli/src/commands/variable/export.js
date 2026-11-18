const fs = require('fs');
const path = require('path');
const api = require('../../api');
const config = require('../../config');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function exportVariables(options) {
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
      console.log('No variables to export.');
      return;
    }

    // Build .env content
    const lines = variables.map(v => `${v.key}=${v.value}`);
    const content = lines.join('\n');

    // Output
    if (options.file) {
      const filePath = path.resolve(process.cwd(), options.file);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Exported ${variables.length} variables to ${filePath}`);
    } else {
      console.log(content);
    }
  } catch (err) {
    console.error('Failed to export variables:', err.response?.data?.error || err.message);
  }
};
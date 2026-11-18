const api = require('../../api');
const config = require('../../config');
const Table = require('cli-table3');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function listVariables(options) {
  try {
    const company = config.getSelectedCompany();
    const project = config.getSelectedProject();

    if (!company || !project) {
      console.error('Please select a company and project first.');
      return;
    }

    let envId = options.env || config.getSelectedEnvironment();
    if (!envId) {
      console.error(
        'No environment selected. Use `envguard environment select <name>` or provide --env <id|name>.'
      );
      return;
    }

    const resolvedEnvId = await resolveEnvironmentId(company, project, envId);
    if (!resolvedEnvId) {
      console.error(`Environment "${envId}" not found.`);
      return;
    }

    const res = await api.get(`/companies/${company}/projects/${project}/environments/${resolvedEnvId}/variables`);
    let variables = res.data;
    if (!Array.isArray(variables)) {
      variables = variables.variables || variables.data || [];
    }

    if (variables.length === 0) {
      console.log('No variables found in this environment.');
      return;
    }

    // Determine max key length to set column widths (optional)
    const table = new Table({
      head: ['Key', 'Value', 'Secret?'],
      colWidths: [30, 50, 8],
      wordWrap: true,
    });
    variables.forEach(v => {
      const value = v.is_secret ? '••••••••' : v.value;
      const secret = v.is_secret ? 'Yes' : 'No';
      table.push([v.key, value, secret]);
    });
    console.log(table.toString());
  } catch (err) {
    console.error('Failed to list variables:', err.response?.data?.error || err.message);
  }
};
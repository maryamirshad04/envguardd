const api = require('../../api');
const config = require('../../config');
const Table = require('cli-table3');

module.exports = async function listEnvironments() {
  try {
    const company = config.getSelectedCompany();
    const project = config.getSelectedProject();

    if (!company || !project) {
      console.error('Please select a company and project first.');
      return;
    }

    const res = await api.get(`/companies/${company}/projects/${project}/environments`);
    let envs = res.data;
    if (!Array.isArray(envs)) envs = envs.environments || envs.data || [];

    if (envs.length === 0) {
      console.log('No environments found in this project.');
      return;
    }

    const table = new Table({ head: ['Name'] });
    envs.forEach(e => {
      table.push([e.name]);
    });
    console.log(table.toString());
    console.log('\nUse `envguard environment select <name>` to choose one.');
  } catch (err) {
    console.error('Failed to list environments:', err.response?.data?.error || err.message);
  }
};
const api = require('../../api');
const config = require('../../config');
const Table = require('cli-table3');

module.exports = async function listProjects() {
  try {
    const company = config.getSelectedCompany();
    if (!company) {
      console.error('Please select a company first using `envguard company select <slug>`');
      return;
    }

    const res = await api.get(`/companies/${company}/projects`);
    let projects = res.data;
    if (!Array.isArray(projects)) {
      projects = projects.projects || projects.data || [];
    }

    if (projects.length === 0) {
      console.log('No projects found in this company.');
      return;
    }

    const table = new Table({ head: ['Name'] });
    projects.forEach(p => {
      table.push([p.slug]);
    });
    console.log(table.toString());
    console.log('\nUse `envguard project select <slug>` to select a project.');
  } catch (err) {
    console.error('Failed to list projects:', err.response?.data?.error || err.message);
  }
};
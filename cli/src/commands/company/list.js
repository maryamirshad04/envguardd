const api = require('../../api');
const Table = require('cli-table3');

module.exports = async function listCompanies() {
  try {
    const res = await api.get('/companies');
    let companies = res.data;
    if (!Array.isArray(companies)) {
      companies = companies.companies || companies.data || [];
    }

    companies = companies.filter(c => c.slug && c.name);

    if (companies.length === 0) {
      console.log('You are not a member of any company.');
      return;
    }

    const table = new Table({ head: ['Name', 'Role'] });
    companies.forEach(c => {
      table.push([c.slug, c.role]);
    });
    console.log(table.toString());
    console.log('\nUse `envguard company select <slug>` to select a company.');
  } catch (err) {
    console.error('Failed to list companies:', err.response?.data?.error || err.message);
  }
};
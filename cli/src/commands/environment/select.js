const api = require('../../api');
const config = require('../../config');

module.exports = async function selectEnvironment(name) {
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

    const env = envs.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!env) {
      console.error(`Environment "${name}" not found.`);
      console.log('Available environments:');
      envs.forEach(e => console.log(`  ${e.name}`));
      return;
    }

    config.setSelectedEnvironment(env.id);
    config.setSelectedEnvironmentName(env.name);
    console.log(`✅ Selected environment: ${env.name}`);
  } catch (err) {
    console.error('Failed to select environment:', err.response?.data?.error || err.message);
  }
};
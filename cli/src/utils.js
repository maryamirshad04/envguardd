const api = require('./api');
const config = require('./config');

async function resolveEnvironmentId(companySlug, projectSlug, input) {
  if (!input) return null;
  // Simple UUID check (36 chars, with hyphens)
  if (input.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input;
  }

  // Treat as name – fetch environments
  const res = await api.get(`/companies/${companySlug}/projects/${projectSlug}/environments`);
  let envs = res.data;
  if (!Array.isArray(envs)) envs = envs.environments || envs.data || [];
  const found = envs.find(e => e.name.toLowerCase() === input.toLowerCase());
  return found ? found.id : null;
}

module.exports = { resolveEnvironmentId };
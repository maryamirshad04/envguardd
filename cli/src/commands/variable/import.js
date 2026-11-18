const fs = require('fs');
const path = require('path');
const api = require('../../api');
const config = require('../../config');
const { resolveEnvironmentId } = require('../../utils');

module.exports = async function importVariables(filePath, options) {
  try {
    const company = config.getSelectedCompany();
    const project = config.getSelectedProject();

    if (!company || !project) {
      console.error('Please select a company and project first.');
      return;
    }

    // Resolve file path
    const absPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
      console.error(`File "${filePath}" not found.`);
      return;
    }

    // Parse .env file
    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split('\n');
    const variables = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (key) variables.push({ key, value });
    }

    if (variables.length === 0) {
      console.log('No variables found in the file.');
      return;
    }

    // Determine environment
    let envName = options.env || config.getSelectedEnvironmentName();
    if (!envName) {
      console.error('No environment specified. Use --env <name> or select one with `envguard environment select`.');
      return;
    }

    // Check if environment exists
    let envId = await resolveEnvironmentId(company, project, envName);
    if (!envId) {
      if (options.create) {
        console.log(`Environment "${envName}" not found. Creating...`);
        try {
          const createRes = await api.post(`/companies/${company}/projects/${project}/environments`, {
            name: envName,
          });
          envId = createRes.data.environment.id;
          console.log(`✅ Environment "${envName}" created.`);
        } catch (err) {
          console.error(`Failed to create environment: ${err.response?.data?.error || err.message}`);
          return;
        }
      } else {
        console.error(`Environment "${envName}" not found. Use --create to create it.`);
        return;
      }
    } else {
      console.log(`Using environment: "${envName}"`);
    }

    // Fetch existing variable keys (to check conflicts)
    let existingKeys = new Set();
    try {
      const listRes = await api.get(`/companies/${company}/projects/${project}/environments/${envId}/variables`);
      let existing = listRes.data;
      if (!Array.isArray(existing)) existing = existing.variables || existing.data || [];
      existingKeys = new Set(existing.map(v => v.key));
    } catch (err) {
      // no variables yet, ignore
    }

    const secretKeys = options.secretKeys ? options.secretKeys.split(',').map(s => s.trim()) : [];
    const allSecret = options.secret || false;
    const skipExisting = options.skipExisting || false;

    // Dry-run
    if (options.dryRun) {
      console.log(`\n🔍 Dry-run: would import ${variables.length} variables into "${envName}":`);
      variables.forEach(v => {
        const exists = existingKeys.has(v.key);
        const willSkip = skipExisting && exists;
        const status = willSkip ? '⏭️ (skip)' : (exists ? '🔄 (update)' : '➕ (new)');
        const isSecret = allSecret || secretKeys.includes(v.key);
        console.log(`  ${v.key}=${isSecret ? '***' : v.value} ${status}`);
      });
      console.log('\nUse --dry-run to preview, remove it to actually import.');
      return;
    }

    // Actually import
    console.log(`📥 Importing ${variables.length} variables into "${envName}"...`);
    const results = [];

    for (const v of variables) {
      const exists = existingKeys.has(v.key);
      if (skipExisting && exists) {
        results.push({ key: v.key, status: '⏭️', message: 'Skipped (already exists)' });
        continue;
      }
      const isSecret = allSecret || secretKeys.includes(v.key);
      try {
        await api.post(`/companies/${company}/projects/${project}/environments/${envId}/variables`, {
          key: v.key,
          value: v.value,
          is_secret: isSecret,
        });
        results.push({ key: v.key, status: '✅', message: exists ? 'Updated' : 'Created' });
      } catch (err) {
        results.push({ key: v.key, status: '❌', message: err.response?.data?.error || err.message });
      }
    }

    // Summary
    const success = results.filter(r => r.status === '✅').length;
    const skipped = results.filter(r => r.status === '⏭️').length;
    const failed = results.filter(r => r.status === '❌').length;
    console.log(`\n✅ ${success} variables imported.`);
    if (skipped > 0) console.log(`⏭️ ${skipped} variables skipped (--skip-existing).`);
    if (failed > 0) {
      console.log(`❌ ${failed} variables failed:`);
      results.filter(r => r.status === '❌').forEach(r => {
        console.log(`  ${r.key}: ${r.message}`);
      });
    }
  } catch (err) {
    console.error('Failed to import variables:', err.response?.data?.error || err.message);
  }
};
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.envguard');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function updateConfig(partial) {
  const current = readConfig();
  const next = { ...current, ...partial };
  writeConfig(next);
  return next;
}

function clearConfig() {
  if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
}

function getToken() {
  const config = readConfig();
  return config.token || null;
}

function setToken(token) {
  updateConfig({ token });
}

function getSelectedCompany() {
  const config = readConfig();
  return config.selectedCompany || null;
}

function setSelectedCompany(slug) {
  updateConfig({ selectedCompany: slug });
}

function getSelectedProject() {
  const config = readConfig();
  return config.selectedProject || null;
}

function setSelectedProject(slug) {
  updateConfig({ selectedProject: slug });
}

function getSelectedEnvironment() {
  const config = readConfig();
  return config.selectedEnvironment || null;
}

function setSelectedEnvironment(envId) {
  updateConfig({ selectedEnvironment: envId });
}

function getSelectedEnvironmentName() {
  const config = readConfig();
  return config.selectedEnvironmentName || null;
}
function setSelectedEnvironmentName(name) {
  updateConfig({ selectedEnvironmentName: name });
}

module.exports = {
  readConfig,
  writeConfig,
  updateConfig,
  clearConfig,
  CONFIG_PATH,
  getToken,
  setToken,
  getSelectedCompany,
  setSelectedCompany,
  getSelectedProject,
  setSelectedProject,
  getSelectedEnvironment,
  setSelectedEnvironment,
  getSelectedEnvironmentName,
  setSelectedEnvironmentName,
};
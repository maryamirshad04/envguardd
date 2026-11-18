const config = require('../../config');

module.exports = async function currentEnvironment() {
  const envId = config.getSelectedEnvironment();
  const envName = config.getSelectedEnvironmentName();
  if (!envId) {
    console.log('No environment selected.');
    return;
  }
  if (envName) {
    console.log(`Selected environment: ${envName}`);
  } else {
    console.log(`Selected environment: ${envId}`);
  }
};
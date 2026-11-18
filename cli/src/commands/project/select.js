const config = require('../../config');

module.exports = function selectProject(slug) {
  const company = config.getSelectedCompany();
  if (!company) {
    console.error('Please select a company first.');
    return;
  }
  config.setSelectedProject(slug);
  console.log(`Selected project: ${slug}`);
};
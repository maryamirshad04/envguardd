const config = require('../../config');

module.exports = function selectCompany(slug) {
  config.setSelectedCompany(slug);
  console.log(`Selected company: ${slug}`);
};
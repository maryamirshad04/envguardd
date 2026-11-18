const config = require('../../config');

module.exports = function currentCompany() {
  const slug = config.getSelectedCompany();
  console.log(slug || 'No company selected');
};
const config = require('../../config');

module.exports = function currentProject() {
  const slug = config.getSelectedProject();
  console.log(slug || 'No project selected');
};
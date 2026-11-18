const config = require('../config');

module.exports = function logout() {
  config.clearConfig();
  console.log('Logged out successfully.');
};
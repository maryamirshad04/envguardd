const api = require('../api');

module.exports = async function whoami() {
  try {
    const res = await api.get('/auth/me');
    const email = res.data.user?.email;
    if (email) {
      console.log(`Logged in as ${email}`);
    } else {
      console.error('Could not retrieve user info.');
    }
  } catch (err) {
    console.error('Not logged in or session expired.');
  }
};
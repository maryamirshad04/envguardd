const chalk = require('chalk');
const open = require('open');
const ora = require('ora');
const api = require('../api');
const config = require('../config');

module.exports = async function login() {
  const spinner = ora('Requesting login code...').start();
  let deviceCode, userCode;
  try {
    const res = await api.post('/auth/cli/initiate');
    deviceCode = res.data.deviceCode;
    userCode = res.data.userCode;
    spinner.succeed(`Your code: ${chalk.bold.green(userCode)}`);
  } catch (err) {
    spinner.fail('Failed to initiate login');
    throw err;
  }
  
  const webUrl = process.env.ENVGUARD_WEB_URL || 'https://env-guardd.vercel.app';
  const approvalUrl = `${webUrl}/cli-login?code=${userCode}`;
  console.log(`\nOpen this URL in your browser to approve:\n${chalk.blue(approvalUrl)}\n`);
  try {
    await open(approvalUrl);
    console.log('Browser opened automatically. If not, copy the URL above and open it manually.');
  } catch (e) {
  }

  // Wait for approval
  spinner.start('Waiting for approval...');
  let attempts = 0;
  const maxAttempts = 60;
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    try {
      const statusRes = await api.get(`/auth/cli/status/${deviceCode}`);
      if (statusRes.data.status === 'approved') {
        const token = statusRes.data.token;
        config.setToken(token);
        spinner.succeed('Login successful!');
        console.log(chalk.green('You are now logged in.'));
        return;
      } else if (statusRes.data.status === 'expired') {
        spinner.fail('Login request expired. Please try again.');
        return;
      }
    } catch (err) {
      // ignore and retry
    }
    attempts++;
  }
  spinner.fail('Timeout waiting for approval.');
};
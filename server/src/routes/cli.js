const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/helpers');

const router = express.Router();

const CODE_EXPIRY_MS = 10 * 60 * 1000; 
const CLI_TOKEN_EXPIRY = '30d';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return `${part()}-${part()}`;
}

router.post('/start', async (req, res) => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  const { error } = await supabase
    .from('cli_auth_requests')
    .insert({ code, status: 'pending', expires_at: expiresAt.toISOString() });

  if (error) {
    logger.error({ error: error.message }, 'Failed to create CLI auth request');
    return res.status(500).json({ error: error.message });
  }

  logger.info({ code }, 'CLI login started');
  res.status(201).json({
    code,
    verificationUrl: `${process.env.CLIENT_URL}/cli-login?code=${code}`,
    expiresInSeconds: CODE_EXPIRY_MS / 1000,
  });
});

router.get('/poll/:code', async (req, res) => {
  const { code } = req.params;

  const { data: reqRow, error } = await supabase
    .from('cli_auth_requests')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !reqRow) {
    return res.status(404).json({ status: 'not_found' });
  }
  if (new Date(reqRow.expires_at) < new Date()) {
    return res.status(410).json({ status: 'expired' });
  }
  if (reqRow.status === 'pending') {
    return res.json({ status: 'pending' });
  }

  const token = reqRow.token;
  await supabase.from('cli_auth_requests').delete().eq('id', reqRow.id);

  res.json({ status: 'approved', token });
});

router.post('/approve', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const { data: reqRow, error } = await supabase
    .from('cli_auth_requests')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !reqRow) return res.status(404).json({ error: 'This code is invalid or already used.' });
  if (new Date(reqRow.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This code has expired. Run the login command again.' });
  }
  if (reqRow.status !== 'pending') {
    return res.status(410).json({ error: 'This code has already been used.' });
  }

  const cliToken = jwt.sign(
    { userId: req.user.userId, email: req.user.email },
    process.env.JWT_SECRET,
    { expiresIn: CLI_TOKEN_EXPIRY }
  );

  const { error: updateError } = await supabase
    .from('cli_auth_requests')
    .update({ status: 'approved', user_id: req.user.userId, token: cliToken })
    .eq('id', reqRow.id);

  if (updateError) return res.status(500).json({ error: updateError.message });

  logger.info({ userId: req.user.userId, email: maskEmail(req.user.email), code }, 'CLI login approved');
  res.json({ message: 'Approved' });
});

module.exports = router;
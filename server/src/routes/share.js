const express = require('express');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');
const logger = require('../utils/logger');
const { logAuditEvent } = require('../utils/audit');
const { SHARE_LINK_CREATED, SHARE_LINK_ACCESSED } = require('../constants/auditActions');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCompanyId(identifier) {
  if (UUID_RE.test(identifier)) {
    return identifier;
  }
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', identifier)
    .single();
  if (error || !data) return null;
  return data.id;
}

async function resolveProjectId(companyId, identifier) {
  if (UUID_RE.test(identifier)) {
    return identifier;
  }
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('company_id', companyId)
    .eq('slug', identifier)
    .single();
  if (error || !data) return null;
  return data.id;
}

async function getEnvironmentWithAccess(companyId, projectId, envId, userId) {
  const { data: membership, error: memErr } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  if (memErr || !membership) {
    logger.debug({ companyId, userId }, 'User not a member');
    return null;
  }

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', companyId)
    .single();
  if (projErr || !project) {
    logger.debug({ companyId, projectId }, 'Project not found in company');
    return null;
  }

  const { data: env, error: envErr } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .eq('project_id', project.id)
    .single();
  if (envErr || !env) {
    logger.debug({ projectId, envId }, 'Environment not found in project');
    return null;
  }

  return env;
}

router.post('/share', requireAuth, async (req, res) => {
  const { companyId, projectId, environmentId, expiryMinutes = 60, variableKeys } = req.body;
  const userId = req.user.userId;

  logger.info({ userId, companyId, projectId, environmentId, expiryMinutes, variableKeys }, 'Generating share link');

  const minExpiry = 5;
  const maxExpiry = 10080;
  if (expiryMinutes < minExpiry || expiryMinutes > maxExpiry) {
    return res.status(400).json({ error: `Expiry must be between ${minExpiry} and ${maxExpiry} minutes` });
  }

  if (!companyId || !projectId || !environmentId) {
    return res.status(400).json({ error: 'companyId, projectId, and environmentId are required' });
  }

  const resolvedCompanyId = await resolveCompanyId(companyId);
  if (!resolvedCompanyId) {
    logger.warn({ userId, companyId }, 'Company not found');
    return res.status(404).json({ error: 'Company not found' });
  }

  const resolvedProjectId = await resolveProjectId(resolvedCompanyId, projectId);
  if (!resolvedProjectId) {
    logger.warn({ userId, projectId }, 'Project not found in this company');
    return res.status(404).json({ error: 'Project not found' });
  }

  const env = await getEnvironmentWithAccess(resolvedCompanyId, resolvedProjectId, environmentId, userId);
  if (!env) {
    logger.warn({ userId, resolvedCompanyId, resolvedProjectId, environmentId }, 'No access to environment');
    return res.status(403).json({ error: 'You do not have access to this environment' });
  }

  let query = supabase
    .from('env_variables')
    .select('key, value_encrypted, is_secret')
    .eq('environment_id', env.id)
    .order('key');

  if (Array.isArray(variableKeys) && variableKeys.length > 0) {
    query = query.in('key', variableKeys);
  }

  const { data: variables, error: varErr } = await query;
  if (varErr) {
    logger.error({ userId, envId: env.id, error: varErr.message }, 'Failed to fetch variables');
    return res.status(500).json({ error: varErr.message });
  }

  if (!variables || variables.length === 0) {
    return res.status(400).json({ error: 'No variables to share' });
  }

  const decryptedVars = variables.map(v => ({
    key: v.key,
    value: decrypt(v.value_encrypted),
    is_secret: v.is_secret,
  }));

  const payload = JSON.stringify(decryptedVars);
  const encryptedPayload = encrypt(payload);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const { data: link, error: insertErr } = await supabase
    .from('shared_links')
    .insert({
      token,
      encrypted_data: encryptedPayload,
      expires_at: expiresAt.toISOString(),
      viewed: false,
    })
    .select()
    .single();

  if (insertErr) {
    logger.error({ userId, envId: env.id, error: insertErr.message }, 'Failed to store shared link');
    return res.status(500).json({ error: insertErr.message });
  }

  const shareUrl = `${process.env.CLIENT_URL}/share/${token}`;

  // AUDIT: Share link created
  await logAuditEvent({
    actorId: userId,
    action: SHARE_LINK_CREATED,
    resourceType: 'environment',
    resourceId: env.id,
    metadata: {
      variableKeys: variableKeys || 'all',
      expiryMinutes,
      token: token.substring(0, 8) + '...',
      companyId: resolvedCompanyId, // Added companyId for filtering
    },
    req,
  });

  logger.info({ userId, envId: env.id, token: token.substring(0, 8) + '...' }, 'Share link generated');
  res.status(201).json({ url: shareUrl });
});

router.get('/share/:token', async (req, res) => {
  const { token } = req.params;
  logger.info({ token: token.substring(0, 8) + '...' }, 'Fetching shared link');

  const { data: link, error: findErr } = await supabase
    .from('shared_links')
    .select('*')
    .eq('token', token)
    .single();

  if (findErr || !link) {
    logger.warn({ token: token.substring(0, 8) + '...' }, 'Shared link not found');
    return res.status(404).json({ error: 'Link not found' });
  }

  if (new Date(link.expires_at) < new Date()) {
    logger.warn({ linkId: link.id, expiresAt: link.expires_at }, 'Shared link expired');
    await supabase.from('shared_links').delete().eq('id', link.id);
    return res.status(410).json({ error: 'This link has expired' });
  }

  if (link.viewed) {
    logger.warn({ linkId: link.id }, 'Shared link already viewed');
    return res.status(410).json({ error: 'This link has already been viewed' });
  }

  await supabase
    .from('shared_links')
    .update({ viewed: true })
    .eq('id', link.id);

  let decrypted;
  try {
    const decryptedPayload = decrypt(link.encrypted_data);
    decrypted = JSON.parse(decryptedPayload);
  } catch (e) {
    logger.error({ linkId: link.id, error: e.message }, 'Failed to decrypt shared link data');
    return res.status(500).json({ error: 'Failed to decrypt data' });
  }

  // AUDIT: Share link accessed (actorId null, but we can include some metadata)
  await logAuditEvent({
    actorId: null, // not authenticated
    action: SHARE_LINK_ACCESSED,
    resourceType: 'share_link',
    resourceId: link.id,
    metadata: {
      token: token.substring(0, 8) + '...',
      varCount: decrypted.length,
      // We don't have companyId here, but we could optionally fetch it from the environment if needed.
      // For now, we omit it as we don't have it.
    },
    req,
  });

  logger.info({ linkId: link.id, varCount: decrypted.length }, 'Shared link retrieved successfully');
  res.json({ variables: decrypted });
});

module.exports = router;
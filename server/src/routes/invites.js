const express = require('express');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/helpers');
const { logAuditEvent } = require('../utils/audit');
const { INVITE_ACCEPTED } = require('../constants/auditActions');

const router = express.Router();

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  logger.info({ token: token.substring(0, 8) + '...' }, 'Fetching invite by token');

  const { data: invite, error } = await supabase
    .from('invites')
    .select('id, email, role, status, expires_at, companies(name)')
    .eq('token', token)
    .single();

  if (error || !invite) {
    logger.warn({ token: token.substring(0, 8) + '...' }, 'Invite not found');
    return res.status(404).json({ error: 'Invite not found' });
  }

  if (invite.status !== 'pending') {
    logger.warn({ inviteId: invite.id, status: invite.status }, 'Invite not pending');
    return res.status(410).json({ error: 'This invite is no longer valid' });
  }

  if (new Date(invite.expires_at) < new Date()) {
    logger.warn({ inviteId: invite.id, expiresAt: invite.expires_at }, 'Invite expired');
    return res.status(410).json({ error: 'This invite has expired' });
  }

  logger.info({ inviteId: invite.id, email: maskEmail(invite.email) }, 'Invite details fetched');
  res.json({
    invite: {
      email: invite.email,
      role: invite.role,
      companyName: invite.companies?.name,
    },
  });
});

router.post('/:token/accept', requireAuth, async (req, res) => {
  const { token } = req.params;
  const userId = req.user.userId;
  const userEmail = req.user.email;
  logger.info(
    { userId, userEmail: maskEmail(userEmail), token: token.substring(0, 8) + '...' },
    'Accepting invite'
  );

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !invite) {
    logger.warn({ userId, token: token.substring(0, 8) + '...' }, 'Invite not found for acceptance');
    return res.status(404).json({ error: 'Invite not found' });
  }

  if (invite.status !== 'pending') {
    logger.warn({ userId, inviteId: invite.id, status: invite.status }, 'Invite not pending');
    return res.status(410).json({ error: 'This invite is no longer valid' });
  }

  if (new Date(invite.expires_at) < new Date()) {
    logger.warn({ userId, inviteId: invite.id, expiresAt: invite.expires_at }, 'Invite expired');
    return res.status(410).json({ error: 'This invite has expired' });
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    logger.warn(
      { userId, inviteEmail: maskEmail(invite.email), userEmail: maskEmail(userEmail) },
      'Email mismatch – invite belongs to different email'
    );
    return res.status(403).json({
      error: `This invite was sent to ${invite.email}. Log in with that email to accept it.`,
    });
  }

  // Store these for audit and consistent use
  const companyId = invite.company_id;
  const role = invite.role;
  const email = invite.email;

  const { error: memberError } = await supabase
    .from('company_members')
    .upsert(
      { company_id: companyId, user_id: userId, role: role },
      { onConflict: 'company_id,user_id' }
    );

  if (memberError) {
    logger.error(
      { userId, inviteId: invite.id, companyId, error: memberError.message },
      'Failed to add member for invite acceptance'
    );
    return res.status(500).json({ error: memberError.message });
  }

  await supabase.from('invites').update({ status: 'accepted' }).eq('id', invite.id);

  // AUDIT: Invite accepted
  await logAuditEvent({
    actorId: userId,
    action: INVITE_ACCEPTED,
    resourceType: 'invite',
    resourceId: invite.id,
    metadata: {
      companyId,
      role,
      email: maskEmail(email),
    },
    req,
  });

  logger.info(
    { userId, inviteId: invite.id, companyId, role },
    'Invite accepted successfully'
  );
  res.json({ companyId });
});

module.exports = router;
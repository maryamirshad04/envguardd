const express = require('express');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/companyAccess');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

// GET /api/audit/:companySlug
router.get('/:companySlug', requireMember, requireAdmin, async (req, res) => {
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId }, 'Fetching audit logs');

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*, actor:users!actor_id(email)')
    .or(`resource_id.eq.${companyId},metadata->>companyId.eq.${companyId}`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    logger.error({ companyId, error: error.message }, 'Failed to fetch audit logs');
    return res.status(500).json({ error: error.message });
  }

  res.json({ logs });
});

module.exports = router;
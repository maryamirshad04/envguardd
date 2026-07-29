const express = require('express');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/companyAccess');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 100;

function sanitizeForFilter(value) {
  return value.replace(/[(),]/g, '');
}

// GET /api/audit/:companySlug?page=1&pageSize=15&q=...&action=SECRET
router.get('/:companySlug', requireMember, requireAdmin, async (req, res) => {
  const companyId = req.companyId;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE)
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const rawQ = (req.query.q || '').trim();
  const q = sanitizeForFilter(rawQ);
  const action = sanitizeForFilter((req.query.action || '').trim());

  logger.info({ userId: req.user.userId, companyId, page, pageSize, q, action }, 'Fetching audit logs');

  let actorIds = [];
  if (q) {
    const { data: matchingUsers, error: userErr } = await supabase
      .from('users')
      .select('id')
      .ilike('email', `%${q}%`);
    if (userErr) {
      logger.error({ companyId, error: userErr.message }, 'Failed to resolve actor search');
      return res.status(500).json({ error: userErr.message });
    }
    actorIds = (matchingUsers || []).map((u) => u.id);
  }

  let query = supabase
    .from('audit_logs')
    .select('*, actor:users!actor_id(email)', { count: 'exact' })
    .or(`resource_id.eq.${companyId},metadata->>companyId.eq.${companyId}`);

  if (action && action !== 'all') {
    query = query.ilike('action', `${action}%`);
  }

  if (q) {
    const orParts = [`action.ilike.%${q}%`, `resource_type.ilike.%${q}%`];
    if (actorIds.length > 0) {
      orParts.push(`actor_id.in.(${actorIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: logs, error, count } = await query;

  if (error) {
    logger.error({ companyId, error: error.message }, 'Failed to fetch audit logs');
    return res.status(500).json({ error: error.message });
  }

  res.json({
    logs,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  });
});

module.exports = router;
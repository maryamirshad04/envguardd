const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getMembership(companyId, userId) {
  try {
    const { data, error } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    if (error) {
      logger.error({ companyId, userId, error: error.message }, 'Supabase error fetching membership');
      return null;
    }
    return data;
  } catch (err) {
    logger.error({ companyId, userId, error: err.message }, 'Unexpected error in getMembership');
    return null;
  }
}

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

async function requireMember(req, res, next) {
  const identifier = req.params.companySlug || req.params.companyId;
  const userId = req.user?.userId;

  if (!userId) {
    logger.warn({ identifier, path: req.path }, 'requireMember called without userId');
    return res.status(401).json({ error: 'Unauthorized: missing user ID' });
  }

  try {
    const resolvedId = await resolveCompanyId(identifier);
    if (!resolvedId) {
      logger.warn({ identifier, userId }, 'Company not found (slug/UUID)');
      return res.status(404).json({ error: 'Company not found' });
    }

    const membership = await getMembership(resolvedId, userId);
    if (!membership) {
      logger.warn({ companyId: resolvedId, userId }, 'User is not a member');
      return res.status(404).json({ error: 'Company not found' });
    }

    req.companyId = resolvedId;
    req.membership = membership;
    next();
  } catch (err) {
    logger.error({ identifier, userId, error: err.message }, 'requireMember error');
    res.status(500).json({ error: err.message });
  }
}

function requireAdmin(req, res, next) {
  const membership = req.membership;
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { getMembership, requireMember, requireAdmin, resolveCompanyId };
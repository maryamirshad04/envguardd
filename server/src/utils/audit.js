const supabase = require('../config/supabase');
const logger = require('./logger');

/**
 * Log an immutable audit event.
 */
async function logAuditEvent({ actorId, action, resourceType, resourceId, metadata, req }) {
  try {
    const ip = req?.ip || req?.socket?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) {
      logger.warn({ error: error.message, action }, 'Failed to write audit log');
    }
  } catch (err) {
    logger.error({ error: err.message, action }, 'Unexpected error in audit logger');
  }
}

module.exports = { logAuditEvent };
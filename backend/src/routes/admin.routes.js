import { Router } from 'express';
import { getLatestHealth, runHealthCheck } from '../services/health.service.js';
import { getRecentErrors, resolveError, logAdminAction } from '../services/monitor.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Optional: protect with API key or session (e.g. ADMIN_API_KEY header)
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  const expected = process.env.ADMIN_API_KEY;
  if (expected && key !== expected) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.use(requireAdmin);

/** GET /admin/health — latest health status from DB */
router.get('/health', async (req, res) => {
  logger.api('admin_health_get');
  try {
    const results = await getLatestHealth();
    return res.json(results);
  } catch (e) {
    logger.api('admin_health_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/health/run — run health check now */
router.post('/health/run', async (req, res) => {
  logger.api('admin_health_run');
  try {
    const results = await runHealthCheck();
    return res.json(results);
  } catch (e) {
    logger.api('admin_health_run_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** GET /admin/errors — recent system errors */
router.get('/errors', async (req, res) => {
  logger.api('admin_errors_get', { limit: req.query.limit });
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const data = await getRecentErrors(limit);
    return res.json(data);
  } catch (e) {
    logger.api('admin_errors_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/errors/:id/resolve — mark error as resolved */
router.post('/errors/:id/resolve', async (req, res) => {
  logger.api('admin_errors_resolve', { id: req.params.id });
  try {
    const ok = await resolveError(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Error not found' });
    return res.json({ resolved: true });
  } catch (e) {
    logger.api('admin_errors_resolve_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

/** POST /admin/log — log an admin action (e.g. for audit) */
router.post('/log', async (req, res) => {
  logger.api('admin_log', { action: req.body?.action });
  try {
    const { action, target_user_id, details } = req.body || {};
    await logAdminAction(action, target_user_id, details);
    return res.json({ ok: true });
  } catch (e) {
    logger.api('admin_log_error', { error: e.message });
    return res.status(500).json({ error: e.message });
  }
});

export default router;

import { runHealthCheck } from '../services/health.service.js';
import { logger } from '../utils/logger.js';

export async function runHealthJob() {
  const timestamp = new Date().toISOString();
  logger.automation('health_job_start', { timestamp });
  try {
    const results = await runHealthCheck();
    logger.automation('health_job_done', { results });
    return { ok: true, results };
  } catch (e) {
    logger.automation('health_job_fatal', { error: e.message });
    return { ok: false, error: e.message };
  }
}

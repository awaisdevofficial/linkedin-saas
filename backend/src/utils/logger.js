/**
 * Centralized logger - logs everything with timestamps so you know what's happening.
 * Use: log.http(), log.automation(), log.api(), log.info(), log.warn(), log.error()
 */

const ts = () => new Date().toISOString();

function format(level, category, msg, data = {}) {
  const entry = {
    timestamp: ts(),
    level,
    category: category || 'app',
    message: msg,
    ...(Object.keys(data).length ? data : {}),
  };
  return JSON.stringify(entry);
}

function log(level, category, msg, data = {}) {
  const line = format(level, category, msg, data);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  /** HTTP requests - method, path, status, duration, etc. */
  http: (msg, data) => log('info', 'http', msg, data),

  /** Automation jobs - cron, scheduler, generate, publish, etc. */
  automation: (msg, data) => log('info', 'automation', msg, data),

  /** API endpoints - /api/* handlers */
  api: (msg, data) => log('info', 'api', msg, data),

  /** Auth flows - OAuth, login, etc. */
  auth: (msg, data) => log('info', 'auth', msg, data),

  /** General info */
  info: (msg, data) => log('info', 'app', msg, data),

  /** Warnings */
  warn: (msg, data) => log('warn', 'app', msg, data),

  /** Errors */
  error: (msg, data) => log('error', 'app', msg, data),
};

export default logger;

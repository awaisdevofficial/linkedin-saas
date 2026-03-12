import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { startScheduler } from './src/scheduler/index.js';
import { logger } from './src/utils/logger.js';

if (!process.env.OPENAI_API_KEY?.trim()) {
  logger.automation('openai_key_missing', { hint: 'AI jobs will fail without OPENAI_API_KEY' });
}

logger.automation('automation_engine_starting');
startScheduler();
logger.automation('automation_engine_started', { message: 'PostPilot scheduler running - all cron jobs registered' });

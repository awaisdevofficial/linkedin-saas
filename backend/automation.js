import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Load scheduler and logger after .env so supabase.service.js sees SUPABASE_* (ESM hoists imports before body)
const { startScheduler } = await import('./src/scheduler/index.js');
const { logger } = await import('./src/utils/logger.js');

if (!process.env.GEMINI_API_KEY?.trim()) {
  logger.automation('gemini_key_missing', { hint: 'Image generation will be skipped without GEMINI_API_KEY' });
}
if (!process.env.GROQ_API_KEY?.trim()) {
  logger.automation('groq_key_missing', { hint: 'Content/comment/reply generation will fail without GROQ_API_KEY' });
}

logger.automation('automation_engine_starting');
startScheduler();
logger.automation('automation_engine_started', { message: 'PostPilot scheduler running - all cron jobs registered' });

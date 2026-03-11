import 'dotenv/config';
import { startScheduler } from './src/scheduler/index.js';

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.warn('[PostPilot] OPENAI_API_KEY not set. AI jobs will fail.');
}

startScheduler();
console.log('[PostPilot] Automation engine started');

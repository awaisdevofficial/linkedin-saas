/**
 * Load .env before any other app code so process.env is set when supabase.service.js etc. load.
 * Must be the first import in server.js (ESM hoists imports and runs them before file body).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });
if (!process.env.GEMINI_API_KEY?.trim()) {
  const fallbackEnv = path.join(process.cwd(), 'backend', '.env');
  if (fallbackEnv !== envPath) dotenv.config({ path: fallbackEnv });
}

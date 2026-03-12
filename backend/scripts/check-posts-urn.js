/**
 * One-off: list posts with linkedin_post_id (equivalent to:
 * SELECT id, linkedin_post_id FROM posts WHERE linkedin_post_id IS NOT NULL;
 * Run: node scripts/check-posts-urn.js
 */
import 'dotenv/config';
import { getClient } from '../src/services/supabase.service.js';

const supabase = getClient();
const { data, error } = await supabase
  .from('posts')
  .select('id, linkedin_post_id')
  .not('linkedin_post_id', 'is', null);

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
console.log('Posts with linkedin_post_id:', data?.length ?? 0);
data?.forEach((row) => console.log('  id:', row.id, 'linkedin_post_id:', row.linkedin_post_id));

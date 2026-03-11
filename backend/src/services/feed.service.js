import axios from 'axios';

const ACTIVITY_REGEX = /urn:li:activity:(\d+)/gi;

export async function fetchLinkedInFeed(liAtCookie) {
  if (!liAtCookie) return [];
  try {
    const res = await axios.get('https://www.linkedin.com/feed/', {
      headers: {
        Cookie: `li_at=${liAtCookie}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const seen = new Set();
    const items = [];
    let m;
    ACTIVITY_REGEX.lastIndex = 0;
    while ((m = ACTIVITY_REGEX.exec(html)) !== null) {
      const activityId = m[1];
      if (seen.has(activityId)) continue;
      seen.add(activityId);
      const snippet = html.slice(Math.max(0, m.index - 200), m.index + 300).replace(/<[^>]+>/g, ' ');
      items.push({
        activity_id: activityId,
        uri: `urn:li:activity:${activityId}`,
        description: snippet.replace(/\s+/g, ' ').trim().slice(0, 500),
      });
    }
    return items;
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'feed', action: 'fetchLinkedInFeed', error: e.message }));
    return [];
  }
}

export function parseActivityId(uri) {
  if (!uri) return null;
  const str = String(uri);
  const match = str.match(/urn:li:activity:(\d+)/) || str.match(/activity:(\d+)/);
  return match ? match[1] : null;
}

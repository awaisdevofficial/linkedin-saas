import axios from 'axios';

export async function fetchLinkedInFeed(liAtCookie, csrfToken) {
  if (!liAtCookie) return [];

  try {
    const res = await axios.get(
      'https://www.linkedin.com/voyager/api/feed/updatesV2',
      {
        params: {
          count: 20,
          start: 0,
          q: 'feed',
          sortOrder: 'RELEVANCE',
        },
        headers: {
          Cookie: `li_at=${liAtCookie}; JSESSIONID="${csrfToken || 'ajax:0'}"`,
          'csrf-token': csrfToken || 'ajax:0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-li-lang': 'en_US',
          'x-restli-protocol-version': '2.0.0',
          'x-li-track': '{"clientVersion":"1.13.0","mpVersion":"1.13.0","osName":"web","timezoneOffset":5,"timezone":"Asia/Karachi","deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
          Referer: 'https://www.linkedin.com/feed/',
          Accept: 'application/vnd.linkedin.normalized+json+2.1',
        },
      }
    );

    const elementUrns = res.data?.data?.['*elements'] || [];
    const included = res.data?.included || [];

    const items = [];
    for (const urn of elementUrns) {
      try {
        const el = included.find((i) => i.entityUrn === urn || i.$id === urn);
        if (!el) continue;

        const activityUrn = el.entityUrn || urn;
        if (!activityUrn?.includes('activity')) continue;

        const activityMatch = activityUrn.match(/urn:li:activity:(\d+)/);
        if (!activityMatch) continue;

        const activityId = activityMatch[1];
        const cleanUrn = `urn:li:activity:${activityId}`;

        const commentary =
          (typeof el.commentary === 'string' ? el.commentary : el.commentary?.text) ||
          el.text?.text ||
          '';
        const authorUrn = el.actor?.['*actor'] || '';
        const author = included.find((i) => i.entityUrn === authorUrn);
        const authorName = author?.firstName
          ? `${author.firstName} ${author.lastName || ''}`.trim()
          : author?.name || '';
        const description = `${authorName}: ${commentary}`.trim().slice(0, 500) || `Post by ${authorName || 'someone'}`;
        const authorHeadline = author?.headline?.text ?? author?.headline ?? null;
        const authorProfileUrl = author?.publicProfileUrl ?? null;

        items.push({
          activity_id: activityId,
          uri: cleanUrn,
          description,
          author_urn: authorUrn || null,
          author_name: authorName || null,
          author_headline: authorHeadline,
          author_profile_url: authorProfileUrl,
        });
      } catch (_) {
        continue;
      }
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'feed',
      action: 'fetchLinkedInFeed',
      itemCount: items.length,
    }));

    return items;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'feed',
      action: 'fetchLinkedInFeed',
      status: e.response?.status,
      error: e.response?.data ? JSON.stringify(e.response.data) : e.message,
    }));
    return [];
  }
}

export function parseActivityId(uri) {
  if (!uri) return null;
  const str = String(uri);
  const match = str.match(/urn:li:activity:(\d+)/) || str.match(/activity:(\d+)/);
  return match ? match[1] : null;
}

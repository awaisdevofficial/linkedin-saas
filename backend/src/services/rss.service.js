import Parser from 'rss-parser';

const parser = new Parser();
const SPAM_KEYWORDS = ['sale', 'discount', 'promo', 'crypto', 'nft', 'sponsored', 'giveaway', 'buy now', 'advertisement'];
const MAX_AGE_HOURS = 4;
const MAX_ITEMS = 10;

const GOOGLE_NEWS_BASE = 'https://news.google.com/rss/search';

/** Build Google News RSS URL for an industry/niche. Terms can be one string or array; spaces become +. */
export function buildGoogleNewsRssUrl(industryOrKeywords) {
  const terms = Array.isArray(industryOrKeywords) ? industryOrKeywords : [industryOrKeywords];
  const escaped = terms
    .map((t) => String(t).trim().replace(/\s+/g, '+').replace(/"/g, ''))
    .filter(Boolean);
  if (!escaped.length) return null;
  const q = escaped.length === 1 ? `("${escaped[0]}")` : `("${escaped.join('"|"')}")`;
  return `${GOOGLE_NEWS_BASE}?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&hl=en&gl=US&ceid=US:en`;
}

function parseDate(pubDate) {
  if (!pubDate) return 0;
  const d = new Date(pubDate);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function isSpam(title) {
  if (!title) return true;
  const lower = title.toLowerCase();
  return SPAM_KEYWORDS.some((k) => lower.includes(k));
}

function filterByTopicsToAvoid(items, topicsToAvoid) {
  if (!topicsToAvoid?.length) return items;
  const lower = topicsToAvoid.map((t) => t.toLowerCase());
  return items.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const snippet = (item.contentSnippet || item.content || '').toLowerCase();
    const text = title + ' ' + snippet;
    return !lower.some((t) => text.includes(t));
  });
}

function boostByKeywords(items, keywords) {
  if (!keywords?.length) return items;
  const lower = keywords.map((k) => k.toLowerCase());
  return items
    .map((item) => {
      const title = (item.title || '').toLowerCase();
      const snippet = (item.contentSnippet || item.content || '').toLowerCase();
      const text = title + ' ' + snippet;
      const score = lower.filter((k) => text.includes(k)).length;
      return { ...item, _score: score };
    })
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .map(({ _score, ...rest }) => rest);
}

export async function fetchFeedsForUser(userId, getUserRssFeeds, getDefaultFeedsForNiche, getUserContentSettings) {
  const feeds = await getUserRssFeeds(userId);
  let feedList = feeds.length > 0 ? feeds : [];
  let niche = 'tech';
  let topicsToAvoid = [];
  let customKeywords = [];

  if (feedList.length === 0) {
    const settings = await getUserContentSettings(userId);
    niche = settings.niche || 'tech';
    topicsToAvoid = settings.topics_to_avoid || [];
    customKeywords = settings.custom_keywords || [];
    const defaultFeeds = await getDefaultFeedsForNiche(niche);
    feedList = defaultFeeds.length > 0
      ? defaultFeeds.map((f) => ({ feed_url: f.feed_url || f.url, label: f.label }))
      : [];
    if (feedList.length === 0) {
      const googleUrl = buildGoogleNewsRssUrl(niche);
      if (googleUrl) feedList = [{ feed_url: googleUrl, label: `Google News: ${niche}` }];
    }
  } else {
    const settings = await getUserContentSettings(userId);
    topicsToAvoid = settings.topics_to_avoid || [];
    customKeywords = settings.custom_keywords || [];
  }

  const urls = [...new Set(feedList.map((f) => f.feed_url || f.url).filter(Boolean))];
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    urls.map((url) => parser.parseURL(url).catch((err) => ({ items: [], error: err })))
  );

  const allItems = [];
  const seen = new Set();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    let feed = result.value;
    if (feed?.error) continue;
    const items = feed.items || [];
    for (const item of items) {
      const key = `${(item.title || '').trim()}|${(item.link || '').trim()}`;
      if (seen.has(key)) continue;
      if (parseDate(item.pubDate) < cutoff) continue;
      if (isSpam(item.title)) continue;
      seen.add(key);
      allItems.push(item);
    }
  }

  let filtered = filterByTopicsToAvoid(allItems, topicsToAvoid);
  filtered = boostByKeywords(filtered, customKeywords);
  filtered.sort((a, b) => parseDate(b.pubDate) - parseDate(a.pubDate));
  return filtered.slice(0, MAX_ITEMS);
}

export async function fetchFeedsForNiche(niche, getDefaultFeedsForNiche) {
  const feedList = await getDefaultFeedsForNiche(niche);
  const urls = [...new Set(feedList.map((f) => f.feed_url || f.url).filter(Boolean))];
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;

  const results = await Promise.allSettled(
    urls.map((url) => parser.parseURL(url).catch(() => ({ items: [] })))
  );

  const allItems = [];
  const seen = new Set();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const items = (result.value?.items || []).filter((item) => !isSpam(item.title));
    for (const item of items) {
      const key = `${(item.title || '').trim()}|${(item.link || '').trim()}`;
      if (seen.has(key)) continue;
      if (parseDate(item.pubDate) < cutoff) continue;
      seen.add(key);
      allItems.push(item);
    }
  }

  allItems.sort((a, b) => parseDate(b.pubDate) - parseDate(a.pubDate));
  return allItems.slice(0, MAX_ITEMS);
}

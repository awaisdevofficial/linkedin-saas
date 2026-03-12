import OpenAI from 'openai';
import Groq from 'groq-sdk';

const apiKey = process.env.OPENAI_API_KEY;
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
let client = null;
if (apiKey?.trim()) {
  client = new OpenAI({ apiKey: apiKey.trim() });
}

/** True if the error is an OpenAI rate limit (429). */
function isRateLimitError(e) {
  const status = e?.status ?? e?.statusCode ?? e?.response?.status;
  return status === 429;
}

/** True if the error is auth (401) or invalid key. */
function isAuthError(e) {
  const status = e?.status ?? e?.statusCode ?? e?.response?.status;
  const msg = (e?.message || '').toLowerCase();
  return status === 401 || msg.includes('incorrect api key') || msg.includes('invalid api key') || msg.includes('authentication');
}

function getClient() {
  if (!client) throw new Error('OpenAI client not initialized: set OPENAI_API_KEY');
  return client;
}

const SYSTEM_PROMPT = `You are a ghostwriter for a LinkedIn thought leader.
Write posts that sound like a real human wrote them — not AI.

STRICT RULES:
- NO emojis anywhere
- NO bullet points or dashes
- NO bold text (**word**)
- NO hashtags in the post body
- NO "Here's the thing:" or "Let me be honest:" or similar filler openers
- NO numbered lists
- NO all-caps words
- Short punchy paragraphs — 1-3 sentences each
- Use line breaks between paragraphs
- Sound like a smart person sharing a genuine insight
- End with one natural question or observation — not a CTA

Return ONLY valid JSON with no markdown, no backticks, no explanation:
{
  "headline_hook": "First line of the post (max 12 words, no punctuation at end except ?)",
  "post_copy": "Full post body. Plain text only. Natural paragraphs separated by newline. No hook repeated here.",
  "hashtags": ["keyword1", "keyword2", "keyword3"],
  "visual_prompt": {
    "visual_concept": "Describe a clean professional image concept in one sentence",
    "headline_text": "Short bold text for the image (max 8 words)",
    "supporting_text": "One line subtitle for the image",
    "design_style": "minimal, clean, professional, no people",
    "color_scheme": {
      "background": "#0f1420",
      "primary_text": "#ffffff",
      "accent": "#4F6DFF"
    }
  },
  "suggested_comments": [
    "A genuine thoughtful comment someone might leave on this post",
    "Another natural comment from a different perspective",
    "A short question a reader might ask"
  ]
}`;

function buildUserMessage(article, userSettings) {
  return `Write a LinkedIn post based on this article.
Title: ${article.title || ''}
Summary: ${article.contentSnippet || article.summary || ''}
Niche: ${userSettings.niche || 'tech'}
Audience: ${userSettings.target_audience || 'professionals'}
Tone: ${userSettings.post_tone || 'professional'}
${userSettings.custom_keywords?.length ? 'Include these topics naturally: ' + userSettings.custom_keywords.join(', ') : ''}
${userSettings.topics_to_avoid?.length ? 'Do NOT mention: ' + userSettings.topics_to_avoid.join(', ') : ''}`;
}

function parsePostResult(parsed) {
  const hook = parsed.headline_hook ?? parsed.hook ?? '';
  const content = parsed.post_copy ?? parsed.content ?? '';
  const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
  const visual_prompt = parsed.visual_prompt || null;
  const suggested_comments = Array.isArray(parsed.suggested_comments) ? parsed.suggested_comments : [];
  return { headline_hook: hook, post_copy: content, hashtags, visual_prompt, suggested_comments };
}

async function attemptGroqPost(userContent) {
  if (!groqClient) return null;
  const completion = await groqClient.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 2048,
  });
  const text = completion.choices?.[0]?.message?.content?.trim() || '{}';
  const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

export async function generatePost(article, userSettings) {
  const userContent = buildUserMessage(article, userSettings || {});

  async function attemptOpenAI() {
    const openai = getClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '{}';
    return JSON.parse(text);
  }

  try {
    let parsed = client ? await attemptOpenAI() : null;
    if (!parsed && groqClient) {
      parsed = await attemptGroqPost(userContent);
    }
    if (!parsed) {
      throw new Error('OpenAI client not initialized: set OPENAI_API_KEY or GROQ_API_KEY');
    }
    return parsePostResult(parsed);
  } catch (e) {
    if (e instanceof SyntaxError) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const retry = client ? await attemptOpenAI() : await attemptGroqPost(userContent);
        if (retry) return parsePostResult(retry);
        throw e;
      } catch (e2) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'openai', action: 'generatePost', error: e2?.message || String(e2) }));
        throw e2;
      }
    }
    if (isRateLimitError(e)) {
      await new Promise((r) => setTimeout(r, 60000));
      try {
        const retry = client ? await attemptOpenAI() : await attemptGroqPost(userContent);
        if (retry) return parsePostResult(retry);
        throw e;
      } catch (e2) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'openai', action: 'generatePost', error: e2?.message || String(e2) }));
        throw e2;
      }
    }
    if (isAuthError(e) && groqClient) {
      try {
        const parsed = await attemptGroqPost(userContent);
        if (parsed) return parsePostResult(parsed);
      } catch (groqErr) {
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'openai', action: 'generatePost', error: e?.message ?? String(e) }));
        throw e;
      }
    }
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'openai', action: 'generatePost', error: e?.message ?? String(e) }));
    throw e;
  }
}

export async function generateComment(postDescription, systemPrompt) {
  if (!groqClient) throw new Error('GROQ_API_KEY not set');
  try {
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: postDescription?.slice(0, 2000) || 'No context' },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    return text.replace(/^["']|["']$/g, '').trim();
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'groq',
      action: 'generateComment',
      error: e?.message || String(e),
    }));
    throw e;
  }
}

export async function generateReply(systemPrompt) {
  if (!groqClient) throw new Error('GROQ_API_KEY not set');
  try {
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: systemPrompt }],
      temperature: 0.6,
      max_tokens: 80,
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    return text.replace(/^["']|["']$/g, '').trim();
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'groq',
      action: 'generateReply',
      error: e?.message || String(e),
    }));
    throw e;
  }
}

const VISUAL_PROMPT_SYSTEM = `You generate a visual prompt for a LinkedIn post image.
Given the post hook and content, return ONLY valid JSON with no markdown, no backticks:
{
  "visual_concept": "One sentence description of a clean professional image concept",
  "headline_text": "Short bold text for the image (max 8 words)",
  "supporting_text": "One line subtitle for the image",
  "design_style": "minimal, clean, professional, no people",
  "color_scheme": {
    "background": "#0f1420",
    "primary_text": "#ffffff",
    "accent": "#4F6DFF"
  }
}
Keep it professional and suitable for a LinkedIn post graphic.`;

export async function generateVisualPromptFromPost(hook, content) {
  const openai = getClient();
  const text = [hook, content].filter(Boolean).join('\n\n').slice(0, 1500);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: VISUAL_PROMPT_SYSTEM },
      { role: 'user', content: text || 'Professional LinkedIn post' },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || '{}';
  return JSON.parse(raw);
}

export async function generateImage(visualPrompt) {
  try {
    if (!visualPrompt || typeof visualPrompt !== 'object') {
      return null;
    }
    const openai = getClient();
    const v = visualPrompt;
    const prompt = `${v.visual_concept || 'Professional graphic'}. 
Style: ${v.design_style || 'minimal, clean, professional'}. 
Text overlay: "${v.headline_text || ''}".
Professional LinkedIn post image. Dark background. Clean typography. No people. No faces. Minimalist.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'standard',
      n: 1,
    });

    return response.data?.[0]?.url ?? null;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'openai',
      action: 'generateImage',
      error: e.message
    }));
    return null;
  }
}

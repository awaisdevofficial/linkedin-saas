/**
 * KIE API: text-to-image (Flux-2) and text-to-video (Kling 2.6).
 * Uses user's API key from settings. Base URL: https://api.kie.ai
 * @see https://docs.kie.ai
 */
import axios from 'axios';

const KIE_BASE = 'https://api.kie.ai';
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 90; // ~6 min max

function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiKey.trim()}`,
  };
}

/**
 * Poll task status until success or fail. Returns first result URL or null.
 */
async function pollTaskResult(apiKey, taskId) {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const { data: res } = await axios.get(
        `${KIE_BASE}/api/v1/jobs/recordInfo`,
        { params: { taskId }, headers: getHeaders(apiKey), timeout: 15000 }
      );
      if (res?.code !== 200 || !res?.data) continue;
      const state = res.data.state;
      if (state === 'success' && res.data.resultJson) {
        const parsed = JSON.parse(res.data.resultJson);
        const urls = parsed?.resultUrls ?? parsed?.result?.urls;
        if (Array.isArray(urls) && urls.length > 0) return urls[0];
        return null;
      }
      if (state === 'fail') return null;
    } catch (e) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'kie',
        action: 'pollTaskResult',
        taskId,
        error: e.message,
      }));
    }
  }
  return null;
}

/**
 * Text-to-image via Flux-2. Returns image URL or null.
 * @param {string} apiKey - User's KIE API key
 * @param {string} prompt - Text description for the image
 * @param {string} [aspectRatio] - e.g. '16:9', '1:1'
 */
export async function generateImage(apiKey, prompt, aspectRatio = '16:9') {
  if (!apiKey?.trim() || !prompt?.trim()) return null;
  try {
    const { data } = await axios.post(
      `${KIE_BASE}/api/v1/jobs/createTask`,
      {
        model: 'flux-2/flex-text-to-image',
        input: {
          prompt: String(prompt).slice(0, 5000),
          aspect_ratio: aspectRatio === 'widescreen_16_9' ? '16:9' : (aspectRatio || '16:9'),
          resolution: '1K',
        },
      },
      { headers: getHeaders(apiKey), timeout: 20000 }
    );
    const taskId = data?.data?.taskId;
    if (!taskId) return null;
    return await pollTaskResult(apiKey, taskId);
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'kie',
      action: 'generateImage',
      error: e.message,
      status: e.response?.status,
      detail: e.response?.data?.msg,
    }));
    return null;
  }
}

/**
 * Text-to-video via Kling 2.6. Returns video URL or null.
 * No image required — prompt-only generation.
 * @param {string} apiKey - User's KIE API key
 * @param {string} prompt - Text description for the video (max 1000 chars)
 * @param {string} [duration] - '5' or '10' seconds
 * @param {string} [aspectRatio] - '16:9', '1:1', '9:16'
 */
export async function generateVideo(apiKey, prompt, duration = '5', aspectRatio = '16:9') {
  if (!apiKey?.trim() || !prompt?.trim()) return null;
  try {
    const { data } = await axios.post(
      `${KIE_BASE}/api/v1/jobs/createTask`,
      {
        model: 'kling-2.6/text-to-video',
        input: {
          prompt: String(prompt).slice(0, 1000),
          sound: false,
          aspect_ratio: aspectRatio === 'widescreen_16_9' ? '16:9' : (aspectRatio || '16:9'),
          duration: duration === '10' ? '10' : '5',
        },
      },
      { headers: getHeaders(apiKey), timeout: 20000 }
    );
    const taskId = data?.data?.taskId;
    if (!taskId) return null;
    return await pollTaskResult(apiKey, taskId);
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'kie',
      action: 'generateVideo',
      error: e.message,
      status: e.response?.status,
      detail: e.response?.data?.msg,
    }));
    return null;
  }
}

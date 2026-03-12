/**
 * Freepik API: image generation (Mystic) and video generation (Kling v2).
 * Uses user's API key from settings. Base URL: https://api.freepik.com
 * @see https://docs.freepik.com/introduction
 */
import axios from 'axios';

const FREEPIK_BASE = 'https://api.freepik.com';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60; // 3 min max

function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-freepik-api-key': apiKey,
  };
}

/**
 * Create image via Mystic, poll until COMPLETED, return first image URL or null.
 * @param {string} apiKey - User's Freepik API key
 * @param {string} prompt - Text description for the image
 * @param {string} [aspectRatio] - e.g. 'widescreen_16_9', 'square_1_1'
 */
export async function generateImage(apiKey, prompt, aspectRatio = 'widescreen_16_9') {
  if (!apiKey?.trim()) return null;
  try {
    const { data } = await axios.post(
      `${FREEPIK_BASE}/v1/ai/mystic`,
      { prompt, aspect_ratio: aspectRatio },
      { headers: getHeaders(apiKey.trim()), timeout: 20000 }
    );
    const taskId = data?.data?.task_id;
    if (!taskId) return null;
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await axios.get(`${FREEPIK_BASE}/v1/ai/mystic/${taskId}`, {
        headers: getHeaders(apiKey.trim()),
        timeout: 10000,
      });
      const status = statusRes.data?.data?.status;
      const generated = statusRes.data?.data?.generated;
      if (status === 'COMPLETED' && Array.isArray(generated) && generated.length > 0) {
        return generated[0];
      }
      if (status === 'FAILED') return null;
    }
    return null;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'freepik',
      action: 'generateImage',
      error: e.message,
      status: e.response?.status,
      detail: e.response?.data?.message,
    }));
    return null;
  }
}

/**
 * Create video from image via Kling v2, poll until COMPLETED, return first video URL or null.
 * @param {string} apiKey - User's Freepik API key
 * @param {string} imageUrl - Public URL of the source image
 * @param {string} [duration] - '5' or '10' seconds
 * @param {string} [prompt] - Motion description (optional)
 */
export async function generateVideo(apiKey, imageUrl, duration = '5', prompt) {
  if (!apiKey?.trim() || !imageUrl) return null;
  try {
    const body = { image: imageUrl, duration };
    if (prompt) body.prompt = prompt;
    const { data } = await axios.post(
      `${FREEPIK_BASE}/v1/ai/image-to-video/kling-v2`,
      body,
      { headers: getHeaders(apiKey.trim()), timeout: 20000 }
    );
    const taskId = data?.data?.task_id;
    if (!taskId) return null;
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await axios.get(
        `${FREEPIK_BASE}/v1/ai/image-to-video/kling-v2/${taskId}`,
        { headers: getHeaders(apiKey.trim()), timeout: 10000 }
      );
      const status = statusRes.data?.data?.status;
      const generated = statusRes.data?.data?.generated;
      if (status === 'COMPLETED' && Array.isArray(generated) && generated.length > 0) {
        return generated[0];
      }
      if (status === 'FAILED') return null;
    }
    return null;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'freepik',
      action: 'generateVideo',
      error: e.message,
      status: e.response?.status,
      detail: e.response?.data?.message,
    }));
    return null;
  }
}

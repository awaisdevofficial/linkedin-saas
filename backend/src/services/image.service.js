import axios from 'axios';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Process and upload an image. urlOrBuffer can be:
 * - string: URL to download (e.g. DALL-E)
 * - Buffer: raw image bytes (e.g. from Gemini)
 */
export async function processAndUploadImage(userId, urlOrBuffer) {
  try {
    let imageBuffer;
    if (Buffer.isBuffer(urlOrBuffer)) {
      imageBuffer = urlOrBuffer;
    } else if (typeof urlOrBuffer === 'string' && urlOrBuffer.startsWith('data:')) {
      const base64 = urlOrBuffer.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64, 'base64');
    } else {
      const response = await axios.get(urlOrBuffer, { responseType: 'arraybuffer', timeout: 30000 });
      imageBuffer = Buffer.from(response.data);
    }

    // 2. Resize to 1200x627 (no watermark/logo overlay)
    imageBuffer = await sharp(imageBuffer)
      .resize(1200, 627, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer();

    // 3. Upload to Supabase Storage
    const supabase = getSupabase();
    const fileName = `${userId}/${Date.now()}.png`;
    const bucket = 'post-media';

    // Create bucket if it doesn't exist
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;

  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'image',
      action: 'processAndUploadImage',
      userId,
      error: e.message
    }));
    return null;
  }
}

/**
 * Download video from URL and upload to Supabase storage. Returns public URL or null.
 */
export async function uploadVideoFromUrl(userId, videoUrl) {
  try {
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
    const buffer = Buffer.from(response.data);
    const supabase = getSupabase();
    const fileName = `${userId}/${Date.now()}.mp4`;
    const bucket = 'post-media';
    await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'image',
      action: 'uploadVideoFromUrl',
      userId,
      error: e.message,
    }));
    return null;
  }
}

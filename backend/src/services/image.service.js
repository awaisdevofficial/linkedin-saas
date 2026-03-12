import axios from 'axios';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function createWatermarkSvg() {
  return Buffer.from(`
    <svg width="160" height="36" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="36" rx="8" fill="rgba(0,0,0,0.45)"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="15"
        font-weight="bold"
        letter-spacing="1.5"
        fill="white"
        opacity="0.9"
      >✈ POSTPILOT</text>
    </svg>
  `);
}

export async function processAndUploadImage(userId, dalleUrl) {
  try {
    // 1. Download DALL-E image
    const response = await axios.get(dalleUrl, { responseType: 'arraybuffer', timeout: 30000 });
    let imageBuffer = Buffer.from(response.data);

    // 2. Resize to 1200x627 then composite watermark bottom-right
    const watermark = createWatermarkSvg();
    imageBuffer = await sharp(imageBuffer)
      .resize(1200, 627, { fit: 'cover', position: 'center' })
      .composite([
        {
          input: watermark,
          gravity: 'southeast', // no top/left when using gravity
        }
      ])
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

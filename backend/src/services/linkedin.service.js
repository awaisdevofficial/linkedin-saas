import axios from 'axios';

function defaultHeaders(credentials) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };
  if (credentials.liAtCookie) {
    headers['Cookie'] = `li_at=${credentials.liAtCookie}`;
  }
  return headers;
}

const FEEDSHARE_IMAGE_RECIPE = 'urn:li:digitalmediaRecipe:feedshare-image';

/**
 * Upload image via LinkedIn Assets API (registerUpload). Returns urn:li:digitalmediaAsset:xxx
 * which v2/ugcPosts accepts. Using Images API (urn:li:image:) causes INVALID_CONTENT_OWNERSHIP.
 */
async function uploadImageAsset(credentials, mediaUrl) {
  const personUrn = credentials.personUrn.startsWith('urn:')
    ? credentials.personUrn
    : `urn:li:person:${credentials.personUrn}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202602',
  };

  // Step 1 — Register upload (Assets API for ugcPosts compatibility)
  const registerRes = await axios.post(
    'https://api.linkedin.com/rest/assets?action=registerUpload',
    {
      registerUploadRequest: {
        owner: personUrn,
        recipes: [FEEDSHARE_IMAGE_RECIPE],
        serviceRelationships: [
          { identifier: 'urn:li:userGeneratedContent', relationshipType: 'OWNER' },
        ],
        supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
      },
    },
    { headers }
  );

  const value = registerRes.data?.value ?? registerRes.data;
  const assetUrn = value?.asset;
  const uploadMechanism = value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'];
  const uploadUrl = uploadMechanism?.uploadUrl;

  if (!assetUrn || !uploadUrl) {
    throw new Error(`registerUpload missing asset or uploadUrl: ${JSON.stringify(registerRes.data)}`);
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'linkedin',
    action: 'registerUpload',
    assetUrn,
  }));

  // Step 2 — Download image from Supabase
  const imageRes = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  const contentType = imageRes.headers?.['content-type'] || 'image/png';

  // Step 3 — Upload binary to LinkedIn
  const uploadRes = await axios.put(uploadUrl, Buffer.from(imageRes.data), {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': contentType,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'linkedin',
    action: 'imageUploaded',
    status: uploadRes.status,
    assetUrn,
  }));

  // Wait for LinkedIn to process the uploaded image before attaching to post
  await new Promise((r) => setTimeout(r, 5000));

  return assetUrn; // urn:li:digitalmediaAsset:xxx
}

export async function postToLinkedIn(credentials, { hook, content, hashtags, mediaUrl }) {
  if (!credentials.personUrn) {
    throw new Error('personUrn is missing — reconnect LinkedIn in Settings');
  }

  const hashtagText = (hashtags || [])
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');

  const text = [hook, content, hashtagText].filter(Boolean).join('\n\n');

  const personUrn = credentials.personUrn.startsWith('urn:') ? credentials.personUrn : `urn:li:person:${credentials.personUrn}`;
  let imageUrn = null;

  if (mediaUrl && mediaUrl.trim()) {
    try {
      imageUrn = await uploadImageAsset(credentials, mediaUrl.trim());
    } catch (e) {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'linkedin',
        action: 'uploadImageAsset',
        error: msg,
      }));
      // continues as text-only post
    }
  }

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
        media: imageUrn
          ? [
              {
                status: 'READY',
                description: { text: hook?.slice(0, 200) || '' },
                media: imageUrn,
                title: { text: hook?.slice(0, 200) || 'Post image' },
              },
            ]
          : [],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const postHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  try {
    const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, { headers: postHeaders });
    const urn = res.data?.id;
    if (!urn) throw new Error('No post URN in LinkedIn response');
    return urn;
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'postToLinkedIn',
      hasImage: !!imageUrn,
      error: detail,
    }));
    throw new Error(`LinkedIn postToLinkedIn failed: ${detail}`);
  }
}

export async function commentOnPost(credentials, postUrn, commentText) {
  const headers = defaultHeaders(credentials);
  const body = {
    actor: credentials.personUrn,
    message: { text: commentText },
  };
  const res = await axios.post(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
    body,
    { headers }
  );
  return res.data?.id;
}

export async function likePost(credentials, activityId) {
  const urn = activityId.startsWith('urn:') ? activityId : `urn:li:activity:${activityId}`;
  const headers = defaultHeaders(credentials);
  try {
    await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}/likes`,
      { actor: credentials.personUrn },
      { headers }
    );
    return {};
  } catch (e) {
    if (e.response?.status === 409) return { skipped: true };
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'likePost', activityId, error: e.response?.data || e.message }));
    return { error: true };
  }
}

export async function getPostComments(credentials, postUrn) {
  const headers = defaultHeaders(credentials);
  try {
    const res = await axios.get(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
      { headers }
    );
    const elements = res.data?.elements || [];
    return elements.map((el) => ({
      commentUrn: el.id,
      authorUrn: el.actor,
      text: el.message?.text || '',
      createdAt: el.created?.time,
    }));
  } catch (e) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'getPostComments', postUrn, error: e.message }));
    return [];
  }
}

export async function replyToComment(credentials, postUrn, commentUrn, replyText) {
  const headers = defaultHeaders(credentials);
  const body = {
    actor: credentials.personUrn,
    message: { text: replyText },
    parentComment: commentUrn,
  };
  const res = await axios.post(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
    body,
    { headers }
  );
  return res.data?.id;
}

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

/**
 * Upload image via LinkedIn Images API (initializeUpload). Returns urn:li:image:xxx
 * for use with /rest/posts.
 */
async function uploadImageAsset(credentials, mediaUrl) {
  const personUrn = credentials.personUrn.startsWith('urn:')
    ? credentials.personUrn
    : `urn:li:person:${credentials.personUrn}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202503',
  };

  const initRes = await axios.post(
    'https://api.linkedin.com/rest/images?action=initializeUpload',
    { initializeUploadRequest: { owner: personUrn } },
    { headers }
  );

  const uploadUrl = initRes.data?.value?.uploadUrl;
  const imageUrn = initRes.data?.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error(`initializeUpload failed: ${JSON.stringify(initRes.data)}`);
  }

  const imageRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 });

  await axios.put(uploadUrl, Buffer.from(imageRes.data), {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  await new Promise(r => setTimeout(r, 5000));
  return imageUrn; // urn:li:image:xxx
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

  const postHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202503',
  };

  const body = imageUrn ? {
    author: personUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        altText: hook?.slice(0, 200) || 'Post image',
        id: imageUrn,
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  } : {
    author: personUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  try {
    const res = await axios.post('https://api.linkedin.com/rest/posts', body, { headers: postHeaders });
    const rawUrn = res.headers?.['x-restli-id'] || res.data?.id;
    if (!rawUrn) throw new Error('No post URN in LinkedIn response');
    // Store as urn:li:ugcPost: for consistency (same numeric ID as urn:li:share:)
    const urnToStore = rawUrn.replace('urn:li:share:', 'urn:li:ugcPost:');

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'postToLinkedIn',
      urn: urnToStore,
      hasImage: !!imageUrn,
    }));

    return urnToStore;
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
  try {
    const res = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
      {
        actor: credentials.personUrn,
        message: { text: commentText },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'commentOnPost', postUrn, status: res.status }));
    return res.headers?.['x-restli-id'] || res.data?.id;
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'commentOnPost', postUrn, error: detail }));
    throw e;
  }
}

export async function likePost(credentials, activityId) {
  const urn = activityId.startsWith('urn:') ? activityId : `urn:li:activity:${activityId}`;
  try {
    await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}/likes`,
      { actor: credentials.personUrn },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'likePost', activityId, status: 'liked' }));
    return {};
  } catch (e) {
    if (e.response?.status === 409) return { skipped: true };
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'likePost', activityId, error: e.response?.data || e.message }));
    return { error: true };
  }
}

export async function getPostComments(credentials, postUrn) {
  if (!credentials.liAtCookie) return { comments: [], activityUrn: null };

  const urnId = postUrn.split(':').pop();

  const headers = {
    Cookie: `li_at=${credentials.liAtCookie}; JSESSIONID="${credentials.csrfToken || 'ajax:0'}"`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'x-li-lang': 'en_US',
    'x-restli-protocol-version': '2.0.0',
    'csrf-token': credentials.csrfToken || 'ajax:0',
    Referer: 'https://www.linkedin.com/feed/',
  };

  try {
    // Step 1 — fetch the post to get the real activity URN
    const postRes = await axios.get(
      `https://www.linkedin.com/voyager/api/feed/updates/${encodeURIComponent(`urn:li:share:${urnId}`)}`,
      { headers }
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'voyagerPostLookup',
      status: postRes.status,
      urn: postRes.data?.urn,
    }));

    const memberUrn = postRes.data?.value?.['com.linkedin.voyager.feed.render.UpdateV2']?.actor?.urn;
    credentials._memberUrn = memberUrn;

    const activityUrn = postRes.data?.urn
      || postRes.data?.updateMetadata?.urn
      || `urn:li:activity:${urnId}`;

    // Try extracting comments from the update response directly
    const updateValue = postRes.data?.value?.['com.linkedin.voyager.feed.render.UpdateV2'];
    const inlineComments = updateValue?.socialDetail?.comments?.elements
      || updateValue?.commentary?.comments?.elements
      || [];

    if (inlineComments.length > 0) {
      return {
        comments: inlineComments.map((el) => ({
          commentUrn: el.urn,
          authorUrn: el.commenter?.['com.linkedin.voyager.feed.MemberActor']?.urn || el.commenterProfileId,
          text: (el.commentV2?.text || '').trim(),
          createdAt: el.createdTime,
        })),
        activityUrn,
      };
    }

    // Step 3 — use socialDetail with the real activity URN from step 1
    const commentsRes = await axios.get(
      `https://www.linkedin.com/voyager/api/feed/updates/${encodeURIComponent(activityUrn)}/socialDetail`,
      {
        params: { count: 50, start: 0 },
        headers,
      }
    );

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'voyagerComments',
      activityUrn,
      status: commentsRes.status,
    }));

    const elements = commentsRes.data?.socialDetail?.comments?.elements
      || commentsRes.data?.comments?.elements
      || [];
    return {
      comments: elements.map((el) => ({
        commentUrn: el.urn,
        authorUrn: el.commenter?.['com.linkedin.voyager.feed.MemberActor']?.urn || el.commenterProfileId,
        text: (el.commentV2?.text || '').trim(),
        createdAt: el.createdTime,
      })),
      activityUrn,
    };
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'getPostComments',
      postUrn,
      failedUrl: e.config?.url,
      failedParams: e.config?.params,
      error: detail,
    }));
    return { comments: [], activityUrn: null };
  }
}

export async function replyToComment(credentials, activityUrn, commentUrn, replyText) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  // Convert: urn:li:comment:(activity:xxx,yyy) → urn:li:comment:(urn:li:activity:xxx,yyy)
  const normalizedCommentUrn = commentUrn.replace(
    'urn:li:comment:(activity:',
    'urn:li:comment:(urn:li:activity:'
  );

  const body = {
    actor: credentials.personUrn,
    message: { text: replyText },
    parentComment: normalizedCommentUrn,
  };

  try {
    const res = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(activityUrn)}/comments`,
      body,
      { headers }
    );
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'replyPosted',
      activityUrn,
      status: res.status,
    }));
    return res.headers?.['x-restli-id'] || res.data?.id;
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'replyToComment',
      activityUrn,
      commentUrn,
      error: detail,
    }));
    throw e;
  }
}

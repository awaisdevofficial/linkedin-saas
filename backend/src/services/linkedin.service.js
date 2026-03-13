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

/**
 * Upload video via LinkedIn Videos API (initializeUpload, upload parts, finalizeUpload).
 * Returns urn:li:video:xxx for use with /rest/posts.
 * Note: LinkedIn sometimes returns empty uploadToken; we still call finalize with it.
 *
 * LinkedIn video specs (for debugging): MP4 recommended; max file size ~200MB; max duration ~10min.
 * Token must have w_member_social scope for UGC post with video.
 * @see https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
 */
async function uploadVideoAsset(credentials, videoUrl) {
  const personUrn = credentials.personUrn.startsWith('urn:')
    ? credentials.personUrn
    : `urn:li:person:${credentials.personUrn}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202503',
  };

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_fetch_start', url: videoUrl?.slice(0, 80) }));
  let fileSizeBytes = 0;
  let buffer;
  try {
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
    buffer = Buffer.from(videoRes.data);
    fileSizeBytes = buffer.length;
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'video_fetch_failed',
      error: e.message,
      status: e.response?.status,
      responseData: e.response?.data != null ? (typeof e.response.data === 'object' ? e.response.data : String(e.response.data).slice(0, 500)) : undefined,
    }));
    throw e;
  }
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_fetch_done', fileSizeBytes }));

  let initRes;
  try {
    initRes = await axios.post(
      'https://api.linkedin.com/rest/videos?action=initializeUpload',
      {
        initializeUploadRequest: {
          owner: personUrn,
          fileSizeBytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      },
      { headers }
    );
  } catch (e) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'video_initializeUpload_error',
      fileSizeBytes,
      status: e.response?.status,
      responseData: e.response?.data != null ? (typeof e.response.data === 'object' ? e.response.data : String(e.response.data)) : undefined,
      message: e.message,
    }));
    throw e;
  }

  const value = initRes.data?.value;
  const videoUrn = value?.video;
  const uploadToken = value?.uploadToken ?? '';
  const instructions = value?.uploadInstructions || [];

  if (!videoUrn || !instructions.length) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'video_init_failed',
      fileSizeBytes,
      fullResponse: initRes.data,
    }));
    throw new Error(`Video initializeUpload failed: need video URN and uploadInstructions. Response: ${JSON.stringify(initRes.data)}`);
  }
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_init_ok', videoUrn, parts: instructions.length, hasToken: !!uploadToken }));

  const uploadedPartIds = [];
  for (let i = 0; i < instructions.length; i++) {
    const part = instructions[i];
    const start = part.firstByte ?? 0;
    const end = (part.lastByte ?? fileSizeBytes - 1) + 1;
    const chunk = buffer.subarray(start, end);
    const putRes = await axios.put(part.uploadUrl, chunk, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    if (putRes.status < 200 || putRes.status >= 300) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_part_failed', partIndex: i, status: putRes.status, data: putRes.data }));
      throw new Error(`Video part upload failed: ${putRes.status} ${JSON.stringify(putRes.data)}`);
    }
    const rawEtag = putRes.headers?.etag || putRes.headers?.ETag || putRes.headers?.['etag'];
    const etag = rawEtag ? String(rawEtag).replace(/^"|"$/g, '') : null;
    if (etag) uploadedPartIds.push(etag);
    else console.warn(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_part_no_etag', partIndex: i, headersKeys: Object.keys(putRes.headers || {}) }));
  }

  if (uploadedPartIds.length === 0) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_no_part_ids', message: 'No ETags collected from part uploads' }));
    throw new Error('Video upload: no part IDs (ETags) received from LinkedIn part uploads');
  }

  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_finalize_start', videoUrn, partCount: uploadedPartIds.length }));
  const finalizeRes = await axios.post(
    'https://api.linkedin.com/rest/videos?action=finalizeUpload',
    {
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken,
        uploadedPartIds,
      },
    },
    { headers }
  );
  if (finalizeRes.status < 200 || finalizeRes.status >= 300) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_finalize_failed', status: finalizeRes.status, data: finalizeRes.data }));
    throw new Error(`Video finalizeUpload failed: ${finalizeRes.status} ${JSON.stringify(finalizeRes.data)}`);
  }
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'video_upload_done', videoUrn }));

  await new Promise((r) => setTimeout(r, 3000));
  return videoUrn;
}

export async function postToLinkedIn(credentials, { hook, content, hashtags, mediaUrl, videoUrl }) {
  if (!credentials.personUrn) {
    throw new Error('personUrn is missing — reconnect LinkedIn in Settings');
  }

  const hashtagText = (hashtags || [])
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .join(' ');

  const text = [hook, content, hashtagText].filter(Boolean).join('\n\n');

  const personUrn = credentials.personUrn.startsWith('urn:') ? credentials.personUrn : `urn:li:person:${credentials.personUrn}`;
  let mediaUrn = null;

  if (videoUrl && videoUrl.trim()) {
    try {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), service: 'linkedin', action: 'postToLinkedIn_using_video' }));
      mediaUrn = await uploadVideoAsset(credentials, videoUrl.trim());
    } catch (e) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'linkedin',
        action: 'uploadVideoAsset_failed',
        status: e.response?.status,
        responseData: e.response?.data != null ? (typeof e.response.data === 'object' ? e.response.data : String(e.response.data)) : undefined,
        message: e.message,
        stack: e.stack?.slice(0, 500),
      }));
      throw e;
    }
  }
  if (!mediaUrn && mediaUrl && mediaUrl.trim()) {
    try {
      mediaUrn = await uploadImageAsset(credentials, mediaUrl.trim());
    } catch (e) {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'linkedin',
        action: 'uploadImageAsset',
        error: msg,
      }));
    }
  }

  const postHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${credentials.accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202503',
  };

  const body = mediaUrn ? {
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
        altText: hook?.slice(0, 200) || 'Post',
        id: mediaUrn,
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
      hasMedia: !!mediaUrn,
    }));

    return urnToStore;
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'postToLinkedIn',
      hasMedia: !!mediaUrn,
      error: detail,
    }));
    throw new Error(`LinkedIn postToLinkedIn failed: ${detail}`);
  }
}

/**
 * Comment on a LinkedIn post. Returns comment id on success.
 * On 404 (post deleted/unavailable/no permission), returns { postUnavailable: true } so callers
 * can mark the post and avoid infinite retries.
 */
export async function commentOnPost(credentials, postUrn, commentText) {
  // v2/socialActions ONLY accepts activity URNs
  // Convert ugcPost or share URN to activity URN (same numeric ID, different prefix)
  let urn = postUrn;
  if (
    String(postUrn).startsWith('urn:li:ugcPost:') ||
    String(postUrn).startsWith('urn:li:share:')
  ) {
    const id = String(postUrn).split(':').pop();
    urn = `urn:li:activity:${id}`;
  } else if (!String(postUrn).startsWith('urn:')) {
    urn = `urn:li:activity:${postUrn}`;
  }

  try {
    const res = await axios.post(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}/comments`,
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
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'linkedin',
        action: 'commentOnPost',
        originalUrn: postUrn,
        resolvedUrn: urn,
        status: res.status,
      })
    );
    return res.headers?.['x-restli-id'] || res.data?.id;
  } catch (e) {
    const status = e.response?.status;
    const detail = e.response?.data
      ? JSON.stringify(e.response.data)
      : e.message;
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'linkedin',
        action: 'commentOnPost',
        originalUrn: postUrn,
        resolvedUrn: urn,
        status,
        error: detail,
      })
    );
    // 404 = post not found / deleted / no permission to comment — treat as unavailable, do not retry
    if (status === 404) {
      return { postUnavailable: true };
    }
    throw e;
  }
}

export async function likePost(credentials, activityId) {
  const urn = activityId.startsWith('urn:') ? activityId : `urn:li:activity:${activityId}`;
  try {
    const res = await axios.post(
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
    // LinkedIn returns the confirmed activity URN in the `object` field
    const confirmedUrn = res.data?.object || urn;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'likePost',
      activityId,
      confirmedUrn,
      status: 'liked',
    }));
    return { confirmedUrn };
  } catch (e) {
    if (e.response?.status === 409) return { skipped: true };
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'linkedin',
      action: 'likePost',
      activityId,
      error: e.response?.data || e.message,
    }));
    return { error: true };
  }
}

function extractCommenterData(el) {
  const actor =
    el.commenter?.['com.linkedin.voyager.feed.MemberActor'] || {};
  const authorUrn = actor.urn || el.commenterProfileId || '';
  const authorName = actor.name?.text || '';
  const authorHeadline = actor.description?.text || '';
  const authorId = authorUrn.split(':').pop() || '';
  const authorProfileUrl = authorId
    ? `https://www.linkedin.com/in/${authorId}`
    : '';
  return { authorUrn, authorName, authorHeadline, authorProfileUrl };
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
    // Step 1 — fetch the post to get the real activity URN (try ugcPost first — that's what we store — fall back to share)
    const voyagerUrn = postUrn.startsWith('urn:li:ugcPost:') ? postUrn : `urn:li:share:${urnId}`;
    const postRes = await axios.get(
      `https://www.linkedin.com/voyager/api/feed/updates/${encodeURIComponent(voyagerUrn)}`,
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
        comments: inlineComments.map((el) => {
          const { authorUrn, authorName, authorHeadline, authorProfileUrl } =
            extractCommenterData(el);
          return {
            commentUrn: el.urn,
            authorUrn,
            authorName,
            authorHeadline,
            authorProfileUrl,
            text: (el.commentV2?.text || '').trim(),
            createdAt: el.createdTime,
          };
        }),
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
      comments: elements.map((el) => {
        const { authorUrn, authorName, authorHeadline, authorProfileUrl } =
          extractCommenterData(el);
        return {
          commentUrn: el.urn,
          authorUrn,
          authorName,
          authorHeadline,
          authorProfileUrl,
          text: (el.commentV2?.text || '').trim(),
          createdAt: el.createdTime,
        };
      }),
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

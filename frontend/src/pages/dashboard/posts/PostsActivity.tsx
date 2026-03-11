import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  ExternalLink,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ImagePlus,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import { OAUTH_BACKEND_URL } from '../../../lib/config';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';

type PostStatus = 'pending' | 'approved' | 'rejected' | 'ready_to_post' | 'posted';
type PostRow = {
  id: string;
  user_id: string;
  hook: string;
  content: string;
  hashtags: string[];
  status: PostStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  engagement_count: number;
  has_media: boolean;
  media_type: 'image' | 'video' | null;
  suggested_comments: string[];
  media_url?: string | null;
  visual_prompt?: Record<string, unknown> | null;
  created_at?: string;
};

const TABS = ['all', 'pending', 'approved', 'posted', 'rejected'] as const;
const DATE_FILTERS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
] as const;

const statusColors: Record<string, string> = {
  pending: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/30',
  approved: 'bg-[#4F6DFF]/20 text-[#4F6DFF] border-[#4F6DFF]/30',
  ready_to_post: 'bg-[#27C696]/20 text-[#27C696] border-[#27C696]/30',
  rejected: 'bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30',
  posted: 'bg-[#27C696]/20 text-[#27C696] border-[#27C696]/30',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  ready_to_post: Send,
  rejected: XCircle,
  posted: Send,
};

export default function PostsActivity() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdFromUrl = searchParams.get('id');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [scheduleModalPost, setScheduleModalPost] = useState<PostRow | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [editForm, setEditForm] = useState({ hook: '', content: '', hashtags: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostForm, setNewPostForm] = useState({ hook: '', content: '', hashtags: '' });
  const [newPostSaving, setNewPostSaving] = useState(false);
  const [generateImageForNewPost, setGenerateImageForNewPost] = useState(true);
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [generationPaused, setGenerationPaused] = useState(false);
  const [pauseToggleLoading, setPauseToggleLoading] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [replyToggleLoading, setReplyToggleLoading] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingPost, setRegeneratingPost] = useState(false);

  // Realtime posts
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // Safety timeout — never hang forever
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 10000);

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, hook, content, hashtags, status, scheduled_at, posted_at, created_at, media_url, engagement_count, has_media, media_type, suggested_comments, visual_prompt')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) console.error('Posts fetch error:', error.message);
        if (!cancelled) setPosts((data as PostRow[]) || []);
      } catch (err) {
        console.error('Posts fetch failed:', err);
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();

    const channel = supabase
      .channel('posts-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${user.id}` }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!postIdFromUrl || !posts.length) return;
    const post = posts.find((p) => p.id === postIdFromUrl);
    if (post) {
      setSelectedPost(post);
      setEditForm({ hook: post.hook, content: post.content, hashtags: (post.hashtags || []).join(', ') });
      setSearchParams({}, { replace: true });
    }
  }, [postIdFromUrl, posts, setSearchParams]);

  // Load generation_paused (API) and auto_replying (engagement_settings)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [apiRes, engRes] = await Promise.all([
          OAUTH_BACKEND_URL
            ? apiGet('/api/settings/generation-paused').catch(() => null)
            : null,
          supabase.from('engagement_settings').select('auto_replying').eq('user_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (apiRes && typeof apiRes.generation_paused === 'boolean') setGenerationPaused(apiRes.generation_paused);
        if (engRes?.data && typeof (engRes.data as { auto_replying?: boolean }).auto_replying === 'boolean')
          setAutoReply((engRes.data as { auto_replying: boolean }).auto_replying);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (dateFilter !== 'all') {
      const days = dateFilter === '7' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();
      list = list.filter((p) => (p.created_at || '') >= cutoffIso);
    }
    return list.filter((post) => {
      const matchesTab =
        activeTab === 'all' ||
        post.status === activeTab ||
        (activeTab === 'approved' && post.status === 'ready_to_post');
      return matchesTab;
    });
  }, [posts, activeTab, dateFilter]);

  const updateStatus = async (id: string, status: PostStatus, extra?: { scheduled_at?: string; posted_at?: string }) => {
    const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (extra?.scheduled_at) payload.scheduled_at = extra.scheduled_at;
    if (extra?.posted_at) payload.posted_at = extra.posted_at;
    if (status === 'posted') payload.posted = true;
    await supabase.from('posts').update(payload).eq('id', id);
  };

  const handleApprove = (post: PostRow) => updateStatus(post.id, 'approved');
  const handleReject = (post: PostRow) => updateStatus(post.id, 'rejected');
  const handleScheduleSubmit = async () => {
    if (!scheduleModalPost || !scheduleDateTime) return;
    setScheduleSaving(true);
    await updateStatus(scheduleModalPost.id, 'ready_to_post', { scheduled_at: new Date(scheduleDateTime).toISOString() });
    setScheduleSaving(false);
    setScheduleModalPost(null);
    setScheduleDateTime('');
  };
  const handlePostNow = async (post: PostRow) => {
    if (!OAUTH_BACKEND_URL || !user?.id) {
      updateStatus(post.id, 'ready_to_post', { scheduled_at: new Date().toISOString() });
      return;
    }
    setPublishingPostId(post.id);
    try {
      await apiPost('/api/publish-now', { postId: post.id });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, status: 'posted' as const, posted_at: new Date().toISOString() }
            : p
        )
      );
      setSelectedPost(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishingPostId(null);
    }
  };
  const handleDelete = async (post: PostRow) => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setSelectedPost(null);
  };

  const openEdit = (post: PostRow) => {
    setSelectedPost(post);
    setEditForm({ hook: post.hook, content: post.content, hashtags: (post.hashtags || []).join(', ') });
  };
  const handleSaveEdit = async () => {
    if (!selectedPost) return;
    setEditSaving(true);
    const hashtags = editForm.hashtags.split(/[\s,]+/).filter(Boolean).map((t) => t.startsWith('#') ? t : `#${t}`);
    await supabase
      .from('posts')
      .update({
        hook: editForm.hook,
        content: editForm.content,
        hashtags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedPost.id);
    setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? { ...p, hook: editForm.hook, content: editForm.content, hashtags } : p)));
    setEditSaving(false);
    setSelectedPost(null);
  };

  const toggleAutoReply = async () => {
    if (!user?.id) return;
    setReplyToggleLoading(true);
    const newValue = !autoReply;
    setAutoReply(newValue);
    try {
      const { data: existing } = await supabase.from('engagement_settings').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) {
        await supabase.from('engagement_settings').update({ auto_replying: newValue }).eq('user_id', user.id);
      } else {
        await supabase.from('engagement_settings').insert({ user_id: user.id, auto_replying: newValue });
      }
    } catch (_) {
      setAutoReply(!newValue);
    } finally {
      setReplyToggleLoading(false);
    }
  };

  const toggleGeneration = async () => {
    if (!OAUTH_BACKEND_URL || !user?.id) return;
    setPauseToggleLoading(true);
    try {
      await apiPatch('/api/settings/generation-paused', { paused: !generationPaused });
      setGenerationPaused(!generationPaused);
    } catch (_) {
      // Keep current state on error
    } finally {
      setPauseToggleLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!selectedPost || !OAUTH_BACKEND_URL || !user?.id) return;
    setRegeneratingImage(true);
    try {
      const data = await apiPost('/api/regenerate-image', { postId: selectedPost.id });
      setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? { ...p, media_url: data.media_url, status: 'ready_to_post' as const } : p)));
      setSelectedPost((p) => (p && p.id === selectedPost.id ? { ...p, media_url: data.media_url, status: 'ready_to_post' } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate image');
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleRegeneratePost = async () => {
    if (!selectedPost || !OAUTH_BACKEND_URL || !user?.id) return;
    setRegeneratingPost(true);
    try {
      const data = await apiPost('/api/regenerate-post', { postId: selectedPost.id });
      const updated = {
        ...selectedPost,
        hook: data.hook ?? selectedPost.hook,
        content: data.content ?? selectedPost.content,
        hashtags: data.hashtags ?? selectedPost.hashtags,
        status: 'pending' as const,
        media_url: null,
      };
      setEditForm({ hook: updated.hook, content: updated.content, hashtags: (updated.hashtags || []).join(', ') });
      setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? updated : p)));
      setSelectedPost(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to regenerate post');
    } finally {
      setRegeneratingPost(false);
    }
  };

  const handleGenerateNow = async () => {
    if (!user?.id || !OAUTH_BACKEND_URL) return;
    setGenerateLoading(true);
    try {
      await apiPost('/api/generate', { userId: user.id });
      // Refetch after a short delay to pick up new posts
      setTimeout(() => {
        supabase.from('posts').select('id, user_id, hook, content, hashtags, status, scheduled_at, posted_at, engagement_count, has_media, media_type, suggested_comments, media_url, visual_prompt, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
          if (data) setPosts(data as PostRow[]);
        });
      }, 3000);
    } catch (_) {
      // Error already thrown by apiPost
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user?.id || !newPostForm.hook.trim()) return;
    setNewPostSaving(true);
    const hashtags = newPostForm.hashtags.split(/[\s,]+/).filter(Boolean).map((t) => t.startsWith('#') ? t : `#${t}`);
    const { data: inserted, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        hook: newPostForm.hook.trim(),
        content: newPostForm.content.trim() || '',
        hashtags,
        status: 'pending',
      })
      .select('id')
      .single();
    setNewPostSaving(false);
    setNewPostOpen(false);
    setNewPostForm({ hook: '', content: '', hashtags: '' });
    if (error) {
      console.error('Create post failed:', error.message);
      return;
    }
    if (inserted?.id && generateImageForNewPost) {
      apiPost('/api/generate-image-for-post', { postId: inserted.id }).catch((err) =>
        console.error('Generate image for post failed:', err)
      );
    }
  };

  const dateDisplay = (post: PostRow) => post.posted_at || post.scheduled_at || null;

  const tabCount = (tab: string) => {
    if (tab === 'all') return posts.length;
    if (tab === 'approved') return posts.filter((p) => p.status === 'approved' || p.status === 'ready_to_post').length;
    return posts.filter((p) => p.status === tab).length;
  };

  const emptyMessage = () => {
    if (activeTab === 'pending') return 'No posts waiting for approval. Posts are generated every hour from your niche feed.';
    if (activeTab === 'all' && posts.length === 0) return 'No posts yet. Set your niche in Settings; posts are generated every hour.';
    return 'No posts match this filter.';
  };

  return (
    <div className="space-y-6">
      {/* Status bar: generation + auto-reply */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${!generationPaused ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm text-white font-medium">
              {generationPaused ? 'Generation paused' : 'Generating posts hourly'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoReply ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm text-white font-medium">
              {autoReply ? 'Auto-replying to comments' : 'Auto-reply off'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAutoReply}
            disabled={replyToggleLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              autoReply
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30'
                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
            }`}
          >
            {replyToggleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            {autoReply ? 'Auto-Reply On' : 'Auto-Reply Off'}
          </button>
          {OAUTH_BACKEND_URL && (
            <button
              type="button"
              onClick={toggleGeneration}
              disabled={pauseToggleLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                generationPaused
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-white/5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              {pauseToggleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : generationPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              {generationPaused ? 'Resume Generation' : 'Pause Generation'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex flex-wrap">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize px-4 py-2 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#A7B1D8]"
              >
                {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                <Badge variant="secondary" className="ml-2 bg-white/10 text-[#A7B1D8]">
                  {tabCount(tab)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#A7B1D8]">Filter:</span>
          {DATE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === f.id ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="hidden" />
        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-[#A7B1D8] py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading posts...
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPosts.map((post) => {
                const StatusIcon = statusIcons[post.status];
                return (
                  <div key={post.id} className="glass-card p-5 hover:border-[#4F6DFF]/30 transition-colors">
                    {post.media_url && (
                      <div className="w-full rounded-xl overflow-hidden mb-3">
                        <img
                          src={post.media_url}
                          alt="Post image"
                          className="w-full h-40 object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {post.media_url ? (
                          <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                        ) : post.has_media ? (
                          post.media_type === 'video' ? <Video className="w-6 h-6 text-[#A7B1D8]" /> : <ImageIcon className="w-6 h-6 text-[#A7B1D8]" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-[#4F6DFF]/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-[#F2F5FF] font-medium line-clamp-2">{(post.hook || '').slice(0, 100)}{(post.hook || '').length > 100 ? '…' : ''}</h3>
                            <button
                              type="button"
                              onClick={() => setExpandedContentId((id) => (id === post.id ? null : post.id))}
                              className="text-sm text-[#4F6DFF] hover:underline mt-1"
                            >
                              {expandedContentId === post.id ? 'Hide content' : 'View content'}
                            </button>
                            {expandedContentId === post.id && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-sm text-[#A7B1D8] whitespace-pre-wrap">{post.content}</p>
                                {(post.hashtags || []).length > 0 && (
                                  <p className="text-xs text-[#A7B1D8] mt-2">
                                    {(post.hashtags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className={`flex items-center gap-1.5 capitalize ${statusColors[post.status]}`}>
                            <StatusIcon className="w-3 h-3" /> {post.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4 text-sm text-[#A7B1D8]">
                            {post.created_at && <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>}
                            {dateDisplay(post) && <span>Scheduled: {new Date(dateDisplay(post)!).toLocaleString()}</span>}
                            {post.engagement_count > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" /> {post.engagement_count}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {post.status === 'pending' && (
                              <>
                                <Button size="sm" className="bg-[#27C696] hover:bg-[#20A07A] text-white rounded-lg" onClick={() => handleApprove(post)}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                                <Button size="sm" variant="outline" className="border-[#FF6B6B]/30 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded-lg" onClick={() => handleReject(post)}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                              </>
                            )}
                            {(post.status === 'approved' || post.status === 'ready_to_post') && (
                              <>
                                <Button size="sm" className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-lg" onClick={() => { setScheduleModalPost(post); setScheduleDateTime(''); }}><Calendar className="w-4 h-4 mr-1" /> Schedule</Button>
                                <Button size="sm" variant="outline" className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-lg" onClick={() => handlePostNow(post)} disabled={publishingPostId === post.id}>{publishingPostId === post.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} {publishingPostId === post.id ? 'Posting…' : 'Post Now'}</Button>
                              </>
                            )}
                            {post.status === 'posted' && (
                              <Button size="sm" variant="outline" className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-lg"><ExternalLink className="w-4 h-4 mr-1" /> View on LinkedIn</Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-[#A7B1D8] hover:text-[#F2F5FF]" onClick={() => openEdit(post)}><Eye className="w-4 h-4 mr-1" /> View</Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-[#A7B1D8] hover:text-[#F2F5FF]"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#0B1022] border-white/10">
                                <DropdownMenuItem className="text-[#F2F5FF] focus:bg-white/5">Duplicate</DropdownMenuItem>
                                <DropdownMenuItem className="text-[#F2F5FF] focus:bg-white/5" onClick={() => openEdit(post)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-[#FF6B6B] focus:bg-white/5" onClick={() => handleDelete(post)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredPosts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[#A7B1D8] mb-4">{emptyMessage()}</p>
                  {activeTab === 'all' && posts.length === 0 && OAUTH_BACKEND_URL && (
                    <Button
                      onClick={handleGenerateNow}
                      disabled={generateLoading}
                      className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl"
                    >
                      {generateLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Generate Now →
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View / Edit dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl bg-[#0B1022] border-white/10 max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">Post Details</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={`capitalize ${statusColors[selectedPost.status]}`}>{selectedPost.status}</Badge>
                {dateDisplay(selectedPost) && <span className="text-sm text-[#A7B1D8]">{new Date(dateDisplay(selectedPost)!).toLocaleString()}</span>}
              </div>
              {selectedPost.media_url && (
                <div>
                  <label className="text-sm text-[#A7B1D8] mb-2 block">Image</label>
                  <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img src={selectedPost.media_url} alt="Post" className="w-full max-h-48 object-cover" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm text-[#A7B1D8] mb-2 block">Hook</label>
                <textarea
                  value={editForm.hook}
                  onChange={(e) => setEditForm((f) => ({ ...f, hook: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] resize-none focus:border-[#4F6DFF] focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-[#A7B1D8] mb-2 block">Content</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] resize-none focus:border-[#4F6DFF] focus:outline-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm text-[#A7B1D8] mb-2 block">Hashtags (comma separated)</label>
                <Input
                  value={editForm.hashtags}
                  onChange={(e) => setEditForm((f) => ({ ...f, hashtags: e.target.value }))}
                  className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
                />
              </div>
              {(selectedPost.suggested_comments?.length ?? 0) > 0 && (
                <div>
                  <label className="text-sm text-[#A7B1D8] mb-2 block">Suggested Comments</label>
                  <div className="space-y-2">
                    {selectedPost.suggested_comments.map((comment, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10"><p className="text-sm text-[#F2F5FF]">{comment}</p></div>
                    ))}
                  </div>
                </div>
              )}
              {OAUTH_BACKEND_URL && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleRegenerateImage} disabled={regeneratingImage || !selectedPost.visual_prompt} className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl">
                    {regeneratingImage ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
                    Change picture
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRegeneratePost} disabled={regeneratingPost} className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl">
                    {regeneratingPost ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Regenerate post
                  </Button>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
                <Button variant="outline" className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl" onClick={() => setSelectedPost(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule modal */}
      <Dialog open={!!scheduleModalPost} onOpenChange={() => setScheduleModalPost(null)}>
        <DialogContent className="bg-[#0B1022] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">Schedule post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <label className="text-sm text-[#A7B1D8] block">Date & time</label>
            <Input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
            />
            <div className="flex gap-3">
              <Button className="flex-1 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl" onClick={handleScheduleSubmit} disabled={!scheduleDateTime || scheduleSaving}>
                {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Schedule'}
              </Button>
              <Button variant="outline" className="border-white/20 text-[#F2F5FF] rounded-xl" onClick={() => setScheduleModalPost(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New post modal */}
      <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
        <DialogContent className="max-w-xl bg-[#0B1022] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#F2F5FF]">New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-[#A7B1D8] block mb-2">Hook *</label>
              <Input
                value={newPostForm.hook}
                onChange={(e) => setNewPostForm((f) => ({ ...f, hook: e.target.value }))}
                placeholder="Catchy first line..."
                className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-[#A7B1D8] block mb-2">Content</label>
              <textarea
                value={newPostForm.content}
                onChange={(e) => setNewPostForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Post body..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-[#F2F5FF] resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-[#A7B1D8] block mb-2">Hashtags (comma separated)</label>
              <Input
                value={newPostForm.hashtags}
                onChange={(e) => setNewPostForm((f) => ({ ...f, hashtags: e.target.value }))}
                placeholder="#linkedin #growth"
                className="bg-white/5 border-white/10 text-[#F2F5FF] rounded-xl"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#A7B1D8]">
              <input
                type="checkbox"
                checked={generateImageForNewPost}
                onChange={(e) => setGenerateImageForNewPost(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-[#4F6DFF] focus:ring-[#4F6DFF]"
              />
              Generate image for this post
            </label>
            <div className="flex gap-3">
              <Button className="flex-1 bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl" onClick={handleCreatePost} disabled={!newPostForm.hook.trim() || newPostSaving}>
                {newPostSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Post'}
              </Button>
              <Button variant="outline" className="border-white/20 text-[#F2F5FF] rounded-xl" onClick={() => setNewPostOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

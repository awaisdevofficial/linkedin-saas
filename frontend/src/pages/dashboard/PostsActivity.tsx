import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Image,
  Loader2,
  Eye,
  Globe,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Linkedin,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { apiCalls } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type Post = {
  id: string;
  hook: string;
  content: string;
  hashtags: string[] | null;
  status: string;
  posted: boolean;
  media_url: string | null;
  video_url?: string | null;
  publish_with_video?: boolean;
  created_at: string;
  scheduled_at: string | null;
};

const PostsActivity = () => {
  const { user, accessToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPostDialogOpen, setIsNewPostDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvePost, setApprovePost] = useState<Post | null>(null);
  const [scheduleChoice, setScheduleChoice] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [generationPaused, setGenerationPaused] = useState(false);
  const generationPausedFetched = useRef(false);
  const [profile, setProfile] = useState<{ avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [newPost, setNewPost] = useState({
    hook: '',
    content: '',
    hashtags: '',
    generateImage: false,
  });

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    const client = supabase;

    const fetchPosts = async () => {
      const [postsRes, profileRes] = await Promise.all([
        client
          .from('posts')
          .select('id, hook, content, hashtags, status, posted, media_url, video_url, publish_with_video, created_at, scheduled_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        client.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle(),
      ]);
      setPosts((postsRes.data as Post[]) || []);
      setProfile((profileRes.data as { avatar_url?: string }) || null);
      setLoading(false);
    };
    fetchPosts();

    if (accessToken && !generationPausedFetched.current) {
      generationPausedFetched.current = true;
      apiCalls.getGenerationPaused(accessToken).then((r) => setGenerationPaused(r.generation_paused)).catch(() => {});
    }

    const channel = client
      .channel('posts-activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          client
            .from('posts')
            .select('id, hook, content, hashtags, status, posted, media_url, video_url, publish_with_video, created_at, scheduled_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .then((res) => setPosts((res.data as Post[]) || []));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, accessToken]);

  const filteredPosts = posts.filter((post) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'posted' && post.posted) ||
      (activeTab === 'pending' && post.status === 'pending') ||
      (activeTab === 'approved' && (post.status === 'approved' || post.status === 'ready_to_post')) ||
      (activeTab === 'scheduled' && post.status === 'ready_to_post' && post.scheduled_at) ||
      (activeTab === 'rejected' && post.status === 'rejected');
    const matchesSearch =
      post.hook?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700 hover:bg-green-100',
      pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      approved: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      ready_to_post: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      posted: 'bg-green-100 text-green-700 hover:bg-green-100',
      rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
    };
    return styles[status] || styles.pending;
  };

  const handleGenerate = async () => {
    if (!accessToken) return;
    setActionLoading('generate');
    try {
      await apiCalls.generate(accessToken);
      toast.success('Generation started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishNow = async (postId: string) => {
    if (!accessToken) return;
    setActionLoading(postId);
    try {
      await apiCalls.publishNow(accessToken, postId);
      toast.success('Published');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateImage = async (postId: string) => {
    if (!accessToken) return;
    setActionLoading(postId);
    try {
      const res = await apiCalls.regenerateImage(accessToken, postId);
      if (res.media_url) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, media_url: res.media_url! } : p))
        );
        if (viewPost?.id === postId) {
          setViewPost((prev) => (prev ? { ...prev, media_url: res.media_url! } : null));
        }
        toast.success('Picture regenerated');
      } else {
        toast.success('Regeneration started');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regenerate picture failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateImage = async (postId: string) => {
    if (!accessToken) return;
    setActionLoading(postId);
    try {
      const res = await apiCalls.generateImageForPost(accessToken, postId);
      if (res.media_url) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, media_url: res.media_url! } : p)));
        if (viewPost?.id === postId) setViewPost((prev) => (prev ? { ...prev, media_url: res.media_url! } : null));
      }
      toast.success('Image generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateVideo = async (postId: string) => {
    if (!accessToken) return;
    setActionLoading(postId);
    try {
      const res = await apiCalls.generateVideoForPost(accessToken, postId);
      if (res.video_url) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, video_url: res.video_url! } : p)));
        if (viewPost?.id === postId) setViewPost((prev) => (prev ? { ...prev, video_url: res.video_url! } : null));
        toast.success('Video generated and uploaded');
      } else {
        toast.success('Video generation started');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegeneratePost = async (postId: string) => {
    if (!accessToken) return;
    setActionLoading(postId);
    try {
      const res = await apiCalls.regeneratePost(accessToken, postId);
      if (res.hook !== undefined || res.content !== undefined || res.hashtags !== undefined) {
        const updated = {
          hook: res.hook ?? viewPost?.hook ?? '',
          content: res.content ?? viewPost?.content ?? '',
          hashtags: res.hashtags ?? viewPost?.hashtags ?? [],
          status: 'pending' as const,
          media_url: null,
          video_url: null,
        };
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ...updated } : p))
        );
        if (viewPost?.id === postId) setViewPost((prev) => (prev ? { ...prev, ...updated } : null));
        if (selectedPost?.id === postId) setSelectedPost((prev) => (prev ? { ...prev, hook: updated.hook, content: updated.content, hashtags: updated.hashtags } : null));
        toast.success('Post content regenerated');
      } else {
        toast.success('Regeneration started');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regenerate post failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseGeneration = async (paused: boolean) => {
    if (!accessToken) return;
    try {
      await apiCalls.setGenerationPaused(accessToken, paused);
      setGenerationPaused(paused);
      toast.success(paused ? 'Generation paused' : 'Generation resumed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleStatusChange = async (postId: string, newStatus: string) => {
    if (!supabase) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    toast.success('Status updated');
  };

  const openApproveDialog = (post: Post, initialChoice: 'now' | 'later' = 'now') => {
    setApprovePost(post);
    setScheduleChoice(initialChoice);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().slice(0, 10));
    setScheduleTime('09:00');
    setIsApproveDialogOpen(true);
  };

  const handleApproveAndPublishNow = async () => {
    if (!approvePost || !supabase || !accessToken) return;
    setActionLoading(approvePost.id);
    try {
      await supabase.from('posts').update({ status: 'approved' }).eq('id', approvePost.id);
      await apiCalls.publishNow(accessToken, approvePost.id);
      toast.success('Post approved and published');
      setIsApproveDialogOpen(false);
      setApprovePost(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAndSchedule = async () => {
    if (!approvePost || !supabase) return;
    const datetime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (datetime <= new Date()) {
      toast.error('Please choose a future date and time');
      return;
    }
    setActionLoading(approvePost.id);
    try {
      await supabase
        .from('posts')
        .update({
          status: 'ready_to_post',
          scheduled_at: datetime.toISOString(),
        })
        .eq('id', approvePost.id);
      toast.success(`Post scheduled for ${datetime.toLocaleString()}`);
      setIsApproveDialogOpen(false);
      setApprovePost(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Schedule failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePost = async () => {
    if (!supabase || !user) return;
    const tags = newPost.hashtags ? newPost.hashtags.split(/\s+/).filter(Boolean) : [];
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      hook: newPost.hook,
      content: newPost.content,
      hashtags: tags,
      status: 'pending',
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPost({ hook: '', content: '', hashtags: '', generateImage: false });
    setIsNewPostDialogOpen(false);
    toast.success('Post created');
  };

  const handleUpdatePost = async () => {
    if (!supabase || !selectedPost) return;
    await supabase
      .from('posts')
      .update({
        hook: selectedPost.hook,
        content: selectedPost.content,
        hashtags: Array.isArray(selectedPost.hashtags) ? selectedPost.hashtags : [],
      })
      .eq('id', selectedPost.id);
    setIsEditDialogOpen(false);
    setSelectedPost(null);
    toast.success('Post updated');
  };

  const handleDeletePost = async (id: string) => {
    if (!supabase) return;
    await supabase.from('posts').delete().eq('id', id);
    toast.success('Post deleted');
  };

  const handleDuplicatePost = async (post: Post) => {
    if (!supabase || !user) return;
    await supabase.from('posts').insert({
      user_id: user.id,
      hook: post.hook,
      content: post.content,
      hashtags: post.hashtags || [],
      status: 'pending',
    });
    toast.success('Post duplicated');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#10153E]">Posts Activity</h1>
          <p className="text-sm text-[#6B7098]">Manage and schedule your LinkedIn posts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleGenerate}
            disabled={!!actionLoading}
          >
            {actionLoading === 'generate' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Generate
          </Button>
          <Button
            className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full"
            onClick={() => setIsNewPostDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl card-shadow">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={!generationPaused}
              onCheckedChange={(checked) => handlePauseGeneration(!checked)}
            />
            <Label className="text-sm text-[#6B7098]">Auto-generation</Label>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7098]">
          <Clock className="w-4 h-4" />
          Generation: {generationPaused ? 'Paused' : 'Active'}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="posted">Posted</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7098]" />
            <Input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-64 rounded-full bg-white border-[#6B7098]/20"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-full border-[#6B7098]/20">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-2xl p-5 card-shadow cursor-pointer hover:bg-[#F6F8FC]/50 transition-colors"
            onClick={() => {
              setViewPost(post);
              setIsViewDialogOpen(true);
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-[#10153E]">{post.hook || 'Untitled'}</h3>
                  <Badge className={getStatusBadge(post.posted ? 'posted' : post.status)}>
                    {post.posted ? 'posted' : post.status}
                  </Badge>
                </div>
                <p className="text-sm text-[#6B7098] line-clamp-2 mb-2">{post.content || '—'}</p>
                <div className="flex items-center gap-4 text-xs text-[#6B7098]">
                  <span>{(post.hashtags || []).join(' ')}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  {post.scheduled_at && !post.posted && (
                    <>
                      <span>•</span>
                      <span className="text-[#2D5AF6] font-medium">
                        Scheduled {formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-[#6B7098]/30 hover:bg-[#F6F8FC]"
                  onClick={() => {
                    setViewPost(post);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {post.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => openApproveDialog(post)}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => handleStatusChange(post.id, 'rejected')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {!post.posted && (post.status === 'approved' || post.status === 'ready_to_post') && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-[#2D5AF6] text-[#2D5AF6] hover:bg-[#2D5AF6]/10"
                      onClick={() => openApproveDialog(post, 'later')}
                      disabled={!!actionLoading}
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                      onClick={() => handlePublishNow(post.id)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === post.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </>
                )}
                {!post.media_url && !post.posted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => handleGenerateImage(post.id)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                  </Button>
                )}
                {post.media_url && !post.posted && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                    onClick={() => handleGenerateVideo(post.id)}
                    disabled={!!actionLoading}
                    title="Generate video"
                  >
                    {actionLoading === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setViewPost(post);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedPost({ ...post });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {!post.posted && (
                      <DropdownMenuItem
                        onClick={() => handleRegeneratePost(post.id)}
                        disabled={!!actionLoading}
                      >
                        <Repeat2 className="w-4 h-4 mr-2" />
                        Regenerate post
                      </DropdownMenuItem>
                    )}
                    {!post.posted && (post.status === 'approved' || post.status === 'ready_to_post') && (
                      <DropdownMenuItem onClick={() => openApproveDialog(post, 'later')}>
                        <Clock className="w-4 h-4 mr-2" />
                        Schedule
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDuplicatePost(post)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Post Dialog */}
      <Dialog open={isNewPostDialogOpen} onOpenChange={setIsNewPostDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Hook</Label>
              <Input
                value={newPost.hook}
                onChange={(e) => setNewPost({ ...newPost, hook: e.target.value })}
                placeholder="Enter an attention-grabbing hook..."
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Write your post content..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Hashtags</Label>
              <Input
                value={newPost.hashtags}
                onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })}
                placeholder="#hashtag #hashtag2"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={newPost.generateImage}
                onCheckedChange={(checked) =>
                  setNewPost({ ...newPost, generateImage: checked as boolean })
                }
              />
              <Label className="text-sm">Generate AI image (after create)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPostDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
              onClick={handleCreatePost}
            >
              Create Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Hook</Label>
                <Input
                  value={selectedPost.hook}
                  onChange={(e) => setSelectedPost({ ...selectedPost, hook: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedPost.content}
                  onChange={(e) => setSelectedPost({ ...selectedPost, content: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Hashtags</Label>
                <Input
                  value={Array.isArray(selectedPost.hashtags) ? selectedPost.hashtags.join(' ') : ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(/\s+/).filter(Boolean);
                    setSelectedPost({ ...selectedPost, hashtags: tags });
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" onClick={handleUpdatePost}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Post Dialog - LinkedIn-style post preview */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[552px] w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 border-0 shadow-none bg-[#F3F2EF] overflow-hidden">
          {viewPost && (
            <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
              {/* LinkedIn feed gray background */}
              <div className="p-4 bg-[#F3F2EF] min-h-full">
                {/* White post card - LinkedIn exact style */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Header - LinkedIn post header */}
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E7E5E4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="You"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-[#00000099]">
                          {(viewPost.hook || 'P').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#000000E6] text-[14px]">
                          You
                        </span>
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                        <span className="text-[#00000099] text-[12px]">
                          {formatDistanceToNow(new Date(viewPost.created_at), { addSuffix: true })}
                        </span>
                        <Globe className="w-3.5 h-3.5 text-[#00000099] ml-1" />
                      </div>
                      <p className="text-[12px] text-[#00000099] mt-0.5">PostPilot</p>
                    </div>
                    <button className="p-1.5 rounded hover:bg-[#0000000D]">
                      <MoreHorizontal className="w-5 h-5 text-[#00000099]" />
                    </button>
                  </div>

                  {/* Post content - LinkedIn text style */}
                  <div className="px-4 pb-3">
                    <div className="text-[#000000E6] text-[14px] leading-[1.4]">
                      <p className="font-semibold mb-2">{viewPost.hook || 'Untitled'}</p>
                      {((viewPost.content || '—') as string)
                        .split(/\n\n+/)
                        .map((para, i) => (
                          <p key={i} className="mb-3 last:mb-0">
                            {para.split('\n').map((line, j) => (
                              <span key={j}>
                                {line}
                                {j < para.split('\n').length - 1 && <br />}
                              </span>
                            ))}
                          </p>
                        ))}
                    </div>
                    {(viewPost.hashtags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(viewPost.hashtags || []).map((tag) => (
                          <span
                            key={tag}
                            className="text-[14px] text-[#0A66C2] font-medium hover:underline cursor-pointer"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post image - LinkedIn full-width, edge to edge */}
                  {viewPost.media_url && (
                    <div className="w-full">
                      <img
                        src={viewPost.media_url}
                        alt="Post media"
                        className="w-full h-auto object-contain max-h-[500px] bg-[#F3F2EF]"
                      />
                    </div>
                  )}
                  {viewPost.video_url && (
                    <div className="w-full mt-2 bg-black rounded-lg overflow-hidden">
                      <video src={viewPost.video_url} controls className="w-full max-h-[400px]" playsInline />
                    </div>
                  )}

                  {/* Engagement bar - LinkedIn style */}
                  <div className="px-4 py-2 border-t border-[#00000014]">
                    <div className="flex items-center gap-4 text-[14px] text-[#00000099]">
                      <button className="flex items-center gap-1.5 py-1 px-2 -mx-2 rounded hover:bg-[#0000000D] hover:text-[#0A66C2]">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center gap-1.5 py-1 px-2 -mx-2 rounded hover:bg-[#0000000D] hover:text-[#0A66C2]">
                        <MessageCircle className="w-4 h-4" />
                        <span>Comment</span>
                      </button>
                      <button className="flex items-center gap-1.5 py-1 px-2 -mx-2 rounded hover:bg-[#0000000D] hover:text-[#0A66C2]">
                        <Repeat2 className="w-4 h-4" />
                        <span>Repost</span>
                      </button>
                      <button className="flex items-center gap-1.5 py-1 px-2 -mx-2 rounded hover:bg-[#0000000D] hover:text-[#0A66C2]">
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </button>
                    </div>
                    <p className="text-[12px] text-[#00000099] mt-1.5">0 impressions</p>
                  </div>
                </div>

                {/* Publish with Image or Video (when both exist) */}
                {!viewPost.posted && viewPost.media_url && viewPost.video_url && (
                  <div className="mt-3 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <Label className="text-sm font-medium text-[#334155] block mb-2">Publish to LinkedIn with</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="publish-media"
                          checked={!viewPost.publish_with_video}
                          onChange={async () => {
                            if (!supabase || !user) return;
                            await supabase.from('posts').update({ publish_with_video: false }).eq('id', viewPost.id).eq('user_id', user.id);
                            setViewPost((p) => (p ? { ...p, publish_with_video: false } : null));
                            setPosts((prev) => prev.map((p) => (p.id === viewPost.id ? { ...p, publish_with_video: false } : p)));
                          }}
                          className="rounded-full"
                        />
                        <Image className="w-4 h-4" />
                        <span className="text-sm">Image</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="publish-media"
                          checked={!!viewPost.publish_with_video}
                          onChange={async () => {
                            if (!supabase || !user) return;
                            await supabase.from('posts').update({ publish_with_video: true }).eq('id', viewPost.id).eq('user_id', user.id);
                            setViewPost((p) => (p ? { ...p, publish_with_video: true } : null));
                            setPosts((prev) => prev.map((p) => (p.id === viewPost.id ? { ...p, publish_with_video: true } : p)));
                          }}
                          className="rounded-full"
                        />
                        <Video className="w-4 h-4" />
                        <span className="text-sm">Video</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* PostPilot actions footer */}
                <div className="mt-4 flex justify-end gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                    className="rounded-full bg-white border-[#00000014] hover:bg-[#F3F2EF]"
                  >
                    Close
                  </Button>
                  {!viewPost.posted && (
                    <>
                      <Button
                        variant="outline"
                        className="rounded-full border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                        onClick={() => handleRegeneratePost(viewPost.id)}
                        disabled={!!actionLoading}
                        title="Regenerate hook, content and hashtags from feed"
                      >
                        {actionLoading === viewPost.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Repeat2 className="w-4 h-4 mr-2" />
                        )}
                        Regenerate post
                      </Button>
                      {!viewPost.media_url ? (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                          onClick={() => handleGenerateImage(viewPost.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === viewPost.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Image className="w-4 h-4 mr-2" />
                          )}
                          Generate image
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                          onClick={() => handleRegenerateImage(viewPost.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === viewPost.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Regenerate picture
                        </Button>
                      )}
                      {viewPost.media_url && (
                        <Button
                          variant="outline"
                          className="rounded-full border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                          onClick={() => handleGenerateVideo(viewPost.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === viewPost.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Video className="w-4 h-4 mr-2" />
                          )}
                          {viewPost.video_url ? 'Regenerate video' : 'Generate video'}
                        </Button>
                      )}
                      <Button
                        className="bg-[#0A66C2] hover:bg-[#004182] rounded-full"
                        onClick={() => {
                          setIsViewDialogOpen(false);
                          setSelectedPost({ ...viewPost });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve & Publish Dialog */}
      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          setIsApproveDialogOpen(open);
          if (!open) setApprovePost(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvePost?.status === 'pending' ? 'Approve & Publish' : 'Schedule Post'}
            </DialogTitle>
          </DialogHeader>
          {approvePost && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-[#6B7098]">
                {approvePost.status === 'pending'
                  ? `How would you like to publish "${approvePost.hook || 'Untitled'}"?`
                  : `Choose when to publish "${approvePost.hook || 'Untitled'}"`}
              </p>
              {approvePost?.media_url && approvePost?.video_url && (
                <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <Label className="text-sm font-medium text-[#334155] block mb-2">Publish to LinkedIn with</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="approve-publish-media"
                        checked={!approvePost.publish_with_video}
                        onChange={async () => {
                          if (!supabase || !user) return;
                          await supabase.from('posts').update({ publish_with_video: false }).eq('id', approvePost.id).eq('user_id', user.id);
                          setApprovePost((p) => (p ? { ...p, publish_with_video: false } : null));
                          setPosts((prev) => prev.map((p) => (p.id === approvePost.id ? { ...p, publish_with_video: false } : p)));
                        }}
                        className="rounded-full"
                      />
                      <Image className="w-4 h-4" />
                      <span className="text-sm">Image</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="approve-publish-media"
                        checked={!!approvePost.publish_with_video}
                        onChange={async () => {
                          if (!supabase || !user) return;
                          await supabase.from('posts').update({ publish_with_video: true }).eq('id', approvePost.id).eq('user_id', user.id);
                          setApprovePost((p) => (p ? { ...p, publish_with_video: true } : null));
                          setPosts((prev) => prev.map((p) => (p.id === approvePost.id ? { ...p, publish_with_video: true } : p)));
                        }}
                        className="rounded-full"
                      />
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Video</span>
                    </label>
                  </div>
                </div>
              )}
              {approvePost.status === 'pending' && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={scheduleChoice === 'now'}
                      onChange={() => setScheduleChoice('now')}
                      className="rounded-full"
                    />
                    <span className="text-sm font-medium">Publish now</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={scheduleChoice === 'later'}
                      onChange={() => setScheduleChoice('later')}
                      className="rounded-full"
                    />
                    <span className="text-sm font-medium">Schedule for later</span>
                  </label>
                </div>
              )}
              {(scheduleChoice === 'later' || approvePost.status !== 'pending') && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false);
                setApprovePost(null);
              }}
            >
              Cancel
            </Button>
            {scheduleChoice === 'now' && approvePost?.status === 'pending' ? (
              <Button
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleApproveAndPublishNow}
                disabled={!!actionLoading}
              >
                {actionLoading === approvePost?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publish now
              </Button>
            ) : (
              <Button
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6]"
                onClick={handleApproveAndSchedule}
                disabled={!!actionLoading}
              >
                {actionLoading === approvePost?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                Schedule
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostsActivity;

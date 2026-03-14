import { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Reply,
  CheckCircle,
  XCircle,
  Search,
  Linkedin,
  Globe,
  MoreHorizontal,
  ThumbsUp,
  Send,
  Repeat2,
  ExternalLink,
  User,
  Image,
  Video,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

type EngagementLog = {
  id: string;
  action: string;
  post_uri: string | null;
  activity_id: string | null;
  post_content: string | null;
  comment_text: string | null;
  status: string;
  executed_at: string | null;
  created_at: string | null;
  author_urn: string | null;
  author_name: string | null;
  author_headline: string | null;
  author_profile_url: string | null;
  permalink: string | null;
  media_type: string | null;
  original_activity_id: string | null;
  was_reshare: boolean | null;
  engagement_interval_minutes: number | null;
  liked: boolean | null;
  commented: boolean | null;
  description: string | null;
};

type CommentReply = {
  id: string;
  post_id: string | null;
  post_uri: string | null;
  comment_text: string | null;
  reply_text: string;
  status: string;
  created_at: string;
  posts?: { hook: string; content: string } | null;
};

type ActivityItem = {
  id: string;
  type: 'like' | 'comment' | 'reply';
  time: string;
  status: string;
  postContent?: string | null;
  postUri?: string | null;
  myComment?: string | null;
  postHook?: string | null;
  postContentFull?: string | null;
  originalComment?: string | null;
  myReply?: string;
  // Full engagement_logs fields for beautiful view
  author_name?: string | null;
  author_headline?: string | null;
  author_profile_url?: string | null;
  permalink?: string | null;
  media_type?: string | null;
  description?: string | null;
  activity_id?: string | null;
  was_reshare?: boolean | null;
};

const CommentsActivity = () => {
  const { user } = useAuth();
  const [engagementLogs, setEngagementLogs] = useState<EngagementLog[]>([]);
  const [commentReplies, setCommentReplies] = useState<CommentReply[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<ActivityItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url?: string } | null>(null);

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    const client = supabase;
    const userId = user.id;

    const fetchData = async () => {
      const [logsRes, repliesRes, profileRes] = await Promise.all([
        client
          .from('engagement_logs')
          .select('id, action, post_uri, activity_id, post_content, comment_text, status, executed_at, created_at, author_urn, author_name, author_headline, author_profile_url, permalink, media_type, original_activity_id, was_reshare, engagement_interval_minutes, liked, commented, description')
          .eq('user_id', userId)
          .order('executed_at', { ascending: false })
          .limit(100),
        client
          .from('comment_replies')
          .select('id, post_id, post_uri, comment_text, reply_text, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
        client.from('profiles').select('avatar_url').eq('id', userId).maybeSingle(),
      ]);

      const logs = (logsRes.data as EngagementLog[]) || [];
      let replies = (repliesRes.data as CommentReply[]) || [];

      if (replies.length > 0) {
        const postIds = [...new Set(replies.map((r) => r.post_id).filter(Boolean))] as string[];
        const { data: postsData } = await client
          .from('posts')
          .select('id, hook, content')
          .in('id', postIds);
        const postsMap = new Map((postsData || []).map((p) => [p.id, p]));
        replies = replies.map((r) => ({
          ...r,
          posts: r.post_id ? postsMap.get(r.post_id) ?? null : null,
        }));
      }

      setEngagementLogs(logs);
      setCommentReplies(replies);
      setProfile((profileRes.data as { avatar_url?: string }) || null);
      setLoading(false);
    };
    fetchData();

    const logsChannel = client
      .channel('engagement-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engagement_logs', filter: `user_id=eq.${userId}` },
        fetchData
      )
      .subscribe();

    const repliesChannel = client
      .channel('comment-replies')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_replies', filter: `user_id=eq.${userId}` },
        fetchData
      )
      .subscribe();

    return () => {
      client.removeChannel(logsChannel);
      client.removeChannel(repliesChannel);
    };
  }, [user]);

  const activities: ActivityItem[] = [
    ...engagementLogs.map((log) => ({
      id: `log-${log.id}`,
      type: (log.action === 'reply' ? 'reply' : log.action) as 'like' | 'comment' | 'reply',
      time: log.executed_at || log.created_at || '',
      status: log.status,
      postContent: log.post_content || log.description,
      postUri: log.post_uri,
      myComment: log.action === 'comment' || log.action === 'reply' ? log.comment_text : null,
      author_name: log.author_name,
      author_headline: log.author_headline,
      author_profile_url: log.author_profile_url,
      permalink: log.permalink,
      media_type: log.media_type,
      description: log.description,
      activity_id: log.activity_id,
      was_reshare: log.was_reshare,
    })),
    ...commentReplies.map((r) => ({
      id: `reply-${r.id}`,
      type: 'reply' as const,
      time: r.created_at,
      status: r.status,
      postHook: r.posts?.hook,
      postContentFull: r.posts?.content,
      originalComment: r.comment_text,
      myReply: r.reply_text,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const filteredActivities = activities.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesStatus =
      statusFilter === 'all' ||
      item.status === statusFilter ||
      (statusFilter === 'completed' && item.status === 'success');
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (item.postContent || '').toLowerCase().includes(searchLower) ||
      (item.myComment || '').toLowerCase().includes(searchLower) ||
      (item.originalComment || '').toLowerCase().includes(searchLower) ||
      (item.myReply || '').toLowerCase().includes(searchLower) ||
      (item.postHook || '').toLowerCase().includes(searchLower);
    return matchesTab && matchesStatus && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'reply':
        return <Reply className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const displayPostContent = (item: ActivityItem) =>
    item.postContent || item.description || item.postContentFull || (item.postUri?.startsWith('urn:') ? 'Post content not available' : item.postUri) || '—';

  const getStatusBadge = (status: string) => {
    return status === 'completed' || status === 'success' ? (
      <Badge className="bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3 mr-1" /> Success
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700">
        <XCircle className="w-3 h-3 mr-1" /> Failed
      </Badge>
    );
  };

  const likesCount = engagementLogs.filter((l) => l.action === 'like').length;
  const commentsCount = engagementLogs.filter((l) => l.action === 'comment').length;
  const repliesCount = commentReplies.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5AF6] to-[#27C696] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Engagement Activity</h1>
        <p className="text-sm text-[#6B7098]">
          Track likes, comments, and replies — see which post you engaged with and who you replied to
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#6B7098]">Likes</p>
              <p className="text-xl font-bold text-[#10153E]">{likesCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[#6B7098]">Comments</p>
              <p className="text-xl font-bold text-[#10153E]">{commentsCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Reply className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[#6B7098]">Replies</p>
              <p className="text-xl font-bold text-[#10153E]">{repliesCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="like">Likes</TabsTrigger>
            <TabsTrigger value="comment">Comments</TabsTrigger>
            <TabsTrigger value="reply">Replies</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7098]" />
            <Input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-64 rounded-full bg-white border-[#6B7098]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-full bg-white border border-[#6B7098]/20 text-sm"
          >
            <option value="all">All Status</option>
            <option value="completed">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* LinkedIn-style activity cards */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 card-shadow text-center">
            <p className="text-[#6B7098]">No engagement activity yet</p>
            <p className="text-sm text-[#6B7098] mt-1">
              Likes, comments, and replies from automation will appear here
            </p>
          </div>
        ) : (
          filteredActivities.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden card-shadow border border-[#6B7098]/5 cursor-pointer hover:border-[#2D5AF6]/30 hover:shadow-md transition-all"
              onClick={() => {
                setViewItem(item);
                setIsViewModalOpen(true);
              }}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#F6F8FC]">
                    {item.author_profile_url ? (
                      <img src={item.author_profile_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-[#6B7098]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {item.author_name && (
                        <span className="font-semibold text-[#10153E]">{item.author_name}</span>
                      )}
                      {item.author_headline && (
                        <span className="text-xs text-[#6B7098] truncate max-w-[200px]">{item.author_headline}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {getTypeIcon(item.type)}
                      <span className="text-sm font-medium text-[#10153E] capitalize">{item.type}</span>
                      <span className="text-xs text-[#6B7098]">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                      </span>
                      {getStatusBadge(item.status)}
                      {item.media_type && (
                        <Badge variant="outline" className="text-xs gap-1">
                          {item.media_type === 'video' ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                          {item.media_type}
                        </Badge>
                      )}
                      {item.was_reshare && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Repeat2 className="w-3 h-3" /> Reshare
                        </Badge>
                      )}
                    </div>

                    <p className="text-[#10153E] text-sm leading-relaxed line-clamp-3 mb-2">
                      {displayPostContent(item)}
                    </p>

                    {(item.type === 'comment' || item.type === 'reply') && (item.myComment || item.myReply) && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100">
                        <p className="text-xs text-[#6B7098] mb-1">{item.type === 'reply' ? 'Your reply:' : 'Your comment:'}</p>
                        <p className="text-[#10153E] text-sm">{item.myReply ?? item.myComment}</p>
                      </div>
                    )}

                    {item.type === 'reply' && item.originalComment && !item.myComment && (
                      <div className="p-3 rounded-xl bg-[#F6F8FC] border border-[#6B7098]/10">
                        <p className="text-xs text-[#6B7098] mb-1">Reply to:</p>
                        <p className="text-[#10153E] text-sm line-clamp-2">{item.originalComment}</p>
                      </div>
                    )}

                    {item.permalink && (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#2D5AF6] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View on LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7098]">
          Showing {filteredActivities.length} of {activities.length} entries
        </p>
      </div>

      {/* View Engagement Modal - LinkedIn-style, same as post view */}
      <Dialog
        open={isViewModalOpen}
        onOpenChange={(open) => {
          setIsViewModalOpen(open);
          if (!open) setViewItem(null);
        }}
      >
        <DialogContent className="max-w-[552px] w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 border-0 shadow-none bg-[#F3F2EF] overflow-hidden">
          {viewItem && (
            <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
              <div className="p-4 bg-[#F3F2EF] min-h-full">
                {/* Engagement type + status row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {viewItem.type === 'like' && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-red-600" />
                    </div>
                  )}
                  {viewItem.type === 'comment' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  {viewItem.type === 'reply' && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Reply className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                  <span className="font-semibold text-[#10153E] capitalize">{viewItem.type}</span>
                  <span className="text-xs text-[#6B7098]">
                    {formatDistanceToNow(new Date(viewItem.time), { addSuffix: true })}
                  </span>
                  {viewItem.status === 'completed' || viewItem.status === 'success' ? (
                    <Badge className="bg-green-100 text-green-700">Success</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">Failed</Badge>
                  )}
                  {viewItem.media_type && (
                    <Badge variant="outline" className="gap-1">
                      {viewItem.media_type === 'video' ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                      {viewItem.media_type}
                    </Badge>
                  )}
                  {viewItem.was_reshare && (
                    <Badge variant="secondary" className="gap-1">
                      <Repeat2 className="w-3 h-3" /> Reshare
                    </Badge>
                  )}
                </div>

                {/* Post card - LinkedIn style with author */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E7E5E4] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {viewItem.author_profile_url ? (
                        <img
                          src={viewItem.author_profile_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-[#00000099]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#000000E6] text-[14px]">
                          {viewItem.author_name || 'Post author'}
                        </span>
                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                        <span className="text-[#00000099] text-[12px]">
                          {formatDistanceToNow(new Date(viewItem.time), { addSuffix: true })}
                        </span>
                        <Globe className="w-3.5 h-3.5 text-[#00000099] ml-1" />
                      </div>
                      {viewItem.author_headline && (
                        <p className="text-[12px] text-[#00000099] mt-0.5">{viewItem.author_headline}</p>
                      )}
                      <p className="text-[12px] text-[#00000099] mt-0.5">
                        {viewItem.type === 'like' && 'Post you liked'}
                        {viewItem.type === 'comment' && 'Post you commented on'}
                        {viewItem.type === 'reply' && 'Your post'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {viewItem.permalink && (
                        <a
                          href={viewItem.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-[#0000000D] text-[#0A66C2]"
                          title="View on LinkedIn"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                      <button className="p-1.5 rounded hover:bg-[#0000000D]">
                        <MoreHorizontal className="w-5 h-5 text-[#00000099]" />
                      </button>
                    </div>
                  </div>

                  {/* Post content */}
                  <div className="px-4 pb-3">
                    <div className="text-[#000000E6] text-[14px] leading-[1.5] whitespace-pre-wrap">
                      {(displayPostContent(viewItem) as string)
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
                  </div>

                  {/* Your comment / reply */}
                  {viewItem.type === 'comment' && viewItem.myComment && (
                    <div className="px-4 pb-4">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <p className="text-xs text-[#6B7098] mb-1">Your comment:</p>
                        <p className="text-[#10153E] text-[14px]">{viewItem.myComment}</p>
                      </div>
                    </div>
                  )}
                  {viewItem.type === 'reply' && (
                    <div className="px-4 pb-4 space-y-3">
                      {viewItem.originalComment && (
                        <div className="p-3 rounded-xl bg-[#F6F8FC] border border-[#6B7098]/10">
                          <p className="text-xs text-[#6B7098] mb-1">Comment you replied to:</p>
                          <p className="text-[#10153E] text-[14px]">{viewItem.originalComment}</p>
                        </div>
                      )}
                      {viewItem.myReply && (
                        <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                          <p className="text-xs text-[#6B7098] mb-1">Your reply:</p>
                          <p className="text-[#10153E] text-[14px]">{viewItem.myReply}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Engagement bar */}
                  <div className="px-4 py-2 border-t border-[#00000014]">
                    <div className="flex items-center gap-4 text-[14px] text-[#00000099]">
                      <span className="flex items-center gap-1.5 py-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span>Like</span>
                      </span>
                      <span className="flex items-center gap-1.5 py-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>Comment</span>
                      </span>
                      <span className="flex items-center gap-1.5 py-1">
                        <Repeat2 className="w-4 h-4" />
                        <span>Repost</span>
                      </span>
                      <span className="flex items-center gap-1.5 py-1">
                        <Send className="w-4 h-4" />
                        <span>Send</span>
                      </span>
                    </div>
                  </div>
                </div>

                {viewItem.permalink && (
                  <a
                    href={viewItem.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/5 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" /> Open post on LinkedIn
                  </a>
                )}

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewItem(null);
                    }}
                    className="rounded-full bg-white border-[#00000014] hover:bg-[#F3F2EF]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentsActivity;

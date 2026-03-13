import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  Heart,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Reply,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, format, subDays } from 'date-fns';

type Post = {
  id: string;
  hook: string;
  content: string;
  status: string;
  posted: boolean;
  posted_at: string | null;
  created_at: string;
  scheduled_at: string | null;
};

type EngagementLog = {
  id: string;
  action: string;
  post_uri: string | null;
  comment_text: string | null;
  status: string;
  executed_at: string;
  created_at: string;
};

type CommentReply = {
  id: string;
  created_at: string;
};

const fetchAll = async (client: SupabaseClient, userId: string) => {
  const [postsRes, logsRes, repliesRes, connRes] = await Promise.all([
    client
      .from('posts')
      .select('id, hook, content, status, posted, posted_at, created_at, scheduled_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from('engagement_logs')
      .select('id, action, post_uri, comment_text, status, executed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('comment_replies')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('linkedin_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);
  return {
    posts: (postsRes.data as Post[]) || [],
    engagementLogs: (logsRes.data as EngagementLog[]) || [],
    commentReplies: (repliesRes.data as CommentReply[]) || [],
    linkedInConnected: !!connRes.data,
  };
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [engagementLogs, setEngagementLogs] = useState<EngagementLog[]>([]);
  const [commentReplies, setCommentReplies] = useState<CommentReply[]>([]);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    const client = supabase as SupabaseClient;

    const refresh = () =>
      fetchAll(client, user.id).then((r) => {
        setPosts(r.posts);
        setEngagementLogs(r.engagementLogs);
        setCommentReplies(r.commentReplies);
        setLinkedInConnected(r.linkedInConnected);
        setLoading(false);
      });

    refresh();

    const postsChannel = client
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${user.id}` },
        refresh
      )
      .subscribe();

    const logsChannel = client
      .channel('engagement-logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'engagement_logs', filter: `user_id=eq.${user.id}` },
        refresh
      )
      .subscribe();

    const repliesChannel = client
      .channel('comment-replies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_replies', filter: `user_id=eq.${user.id}` },
        refresh
      )
      .subscribe();

    return () => {
      client.removeChannel(postsChannel);
      client.removeChannel(logsChannel);
      client.removeChannel(repliesChannel);
    };
  }, [user]);

  const stats = [
    {
      label: 'Posts Generated',
      value: String(posts.length),
      icon: FileText,
      change: posts.filter((p) => p.status === 'pending').length > 0 ? 'New' : '-',
      color: 'blue',
    },
    {
      label: 'Pending Approval',
      value: String(posts.filter((p) => p.status === 'pending').length),
      icon: Clock,
      change: posts.filter((p) => p.status === 'pending').length > 0 ? 'Review' : '-',
      color: 'amber',
    },
    {
      label: 'Published',
      value: String(posts.filter((p) => p.posted).length),
      icon: CheckCircle,
      change: 'Total',
      color: 'green',
    },
    {
      label: 'Engagements',
      value: String(engagementLogs.length),
      icon: Heart,
      change: engagementLogs.length > 0 ? 'Today' : '-',
      color: 'purple',
    },
  ];

  const quickStats = [
    { label: 'Likes given', value: String(engagementLogs.filter((l) => l.action === 'like').length) },
    { label: 'Comments made', value: String(engagementLogs.filter((l) => l.action === 'comment').length) },
    { label: 'Replies sent', value: String(commentReplies.length) },
    { label: 'Posts this week', value: String(posts.filter((p) => p.posted).length) },
  ];

  const chartData = useMemo(() => {
    const days = 7;
    const data: { date: string; likes: number; comments: number; replies: number; posts: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStart = new Date(d);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const likes = engagementLogs.filter((l) => {
        if (l.action !== 'like') return false;
        const t = new Date(l.executed_at || l.created_at);
        return t >= dayStart && t <= dayEnd;
      }).length;

      const comments = engagementLogs.filter((l) => {
        if (l.action !== 'comment') return false;
        const t = new Date(l.executed_at || l.created_at);
        return t >= dayStart && t <= dayEnd;
      }).length;

      const replies = commentReplies.filter((r) => {
        const t = new Date(r.created_at);
        return t >= dayStart && t <= dayEnd;
      }).length;

      const postsCount = posts.filter((p) => {
        if (!p.posted || !p.posted_at) return false;
        const t = new Date(p.posted_at);
        return t >= dayStart && t <= dayEnd;
      }).length;

      data.push({
        date: format(d, 'MMM d'),
        likes,
        comments,
        replies,
        posts: postsCount,
      });
    }
    return data;
  }, [engagementLogs, commentReplies, posts]);

  const combinedActivity = useMemo(() => {
    const items: { id: string; type: string; message: string; time: string; ts: number; icon: typeof Heart }[] = [];
    engagementLogs.slice(0, 4).forEach((log) => {
      const ts = new Date(log.executed_at || log.created_at).getTime();
      items.push({
        id: `log-${log.id}`,
        type: log.action,
        message:
          log.action === 'like'
            ? 'Liked a post'
            : `Commented: ${(log.comment_text || '').slice(0, 35)}...`,
        time: formatDistanceToNow(new Date(ts), { addSuffix: true }),
        ts,
        icon: log.action === 'like' ? Heart : MessageCircle,
      });
    });
    commentReplies.slice(0, 2).forEach((r) => {
      const ts = new Date(r.created_at).getTime();
      items.push({
        id: `reply-${r.id}`,
        type: 'reply',
        message: 'Replied to a comment on your post',
        time: formatDistanceToNow(new Date(ts), { addSuffix: true }),
        ts,
        icon: Reply,
      });
    });
    posts.slice(0, 2).forEach((p) => {
      const ts = new Date(p.posted_at || p.created_at).getTime();
      items.push({
        id: `post-${p.id}`,
        type: 'post',
        message: p.posted ? 'Published a post' : `Created: ${(p.hook || 'Untitled').slice(0, 30)}...`,
        time: formatDistanceToNow(new Date(ts), { addSuffix: true }),
        ts,
        icon: FileText,
      });
    });
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [engagementLogs, commentReplies, posts]);

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

  const formatPostDate = (post: Post) => {
    if (post.posted && post.posted_at) {
      return formatDistanceToNow(new Date(post.posted_at), { addSuffix: true });
    }
    if (post.scheduled_at) {
      return `Scheduled ${formatDistanceToNow(new Date(post.scheduled_at), { addSuffix: true })}`;
    }
    return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
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
          <h1 className="text-2xl font-bold text-[#10153E]">Dashboard</h1>
          <p className="text-sm text-[#6B7098]">
            Your posts, schedule, and connection status at a glance.
          </p>
        </div>
        <Link to="/dashboard/posts/activity">
          <Button className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="card-shadow border-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#6B7098]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#10153E] mt-1">{stat.value}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    stat.color === 'blue'
                      ? 'bg-blue-100'
                      : stat.color === 'amber'
                        ? 'bg-amber-100'
                        : stat.color === 'green'
                          ? 'bg-green-100'
                          : 'bg-purple-100'
                  }`}
                >
                  <stat.icon
                    className={`w-5 h-5 ${
                      stat.color === 'blue'
                        ? 'text-blue-600'
                        : stat.color === 'amber'
                          ? 'text-amber-600'
                          : stat.color === 'green'
                            ? 'text-green-600'
                            : 'text-purple-600'
                    }`}
                  />
                </div>
              </div>
              <p
                className={`text-xs mt-3 ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-[#6B7098]'
                }`}
              >
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 card-shadow border-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#10153E]">Activity & Recent Posts</CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multi-line chart: likes, comments, replies, posts */}
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7098' }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7098' }} stroke="#9CA3AF" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{ color: '#10153E', fontWeight: 600 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => <span className="text-[#6B7098]">{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    name="Likes"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="comments"
                    name="Comments"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="replies"
                    name="Replies"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    name="Posts"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Feed + Recent Posts in one box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wider mb-3">Activity Feed</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {combinedActivity.length === 0 ? (
                    <p className="text-sm text-[#6B7098]">No activity yet.</p>
                  ) : (
                    combinedActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-[#F6F8FC] transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#2D5AF6]/10 flex items-center justify-center flex-shrink-0">
                          <activity.icon className="w-3.5 h-3.5 text-[#2D5AF6]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#10153E] truncate">{activity.message}</p>
                          <p className="text-xs text-[#6B7098]">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-[#6B7098] uppercase tracking-wider">Recent Posts</p>
                  <Link to="/dashboard/posts/activity" className="text-xs text-[#2D5AF6] hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {posts.length === 0 ? (
                    <p className="text-sm text-[#6B7098]">No posts yet.</p>
                  ) : (
                    posts.slice(0, 5).map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#F6F8FC] hover:bg-[#EEF2F7] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#10153E] truncate">{post.hook || 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={`text-[10px] ${getStatusBadge(post.posted ? 'posted' : post.status)}`}>
                              {post.posted ? 'posted' : post.status}
                            </Badge>
                            <span className="text-xs text-[#6B7098]">{formatPostDate(post)}</span>
                          </div>
                        </div>
                        <Link to={`/dashboard/posts/activity?post=${post.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-white transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-[#6B7098]" />
                          </button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="card-shadow border-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-[#10153E]">LinkedIn Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-3 h-3 rounded-full ${linkedInConnected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span className="text-sm font-medium text-[#10153E]">
                  {linkedInConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              {linkedInConnected && (
                <p className="text-xs text-[#6B7098]">Connection active</p>
              )}
              <Link to="/dashboard/settings">
                <Button variant="outline" className="w-full mt-4 rounded-full border-[#6B7098]/20">
                  Manage Connection
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="card-shadow border-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-[#10153E]">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat, i) => (
                  <div key={i} className="text-center p-3 rounded-xl bg-[#F6F8FC]">
                    <p className="text-xl font-bold text-[#10153E]">{stat.value}</p>
                    <p className="text-xs text-[#6B7098] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default DashboardHome;

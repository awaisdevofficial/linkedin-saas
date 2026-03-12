import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Send,
  TrendingUp,
  Calendar,
  Link2,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  Clock,
  Heart,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';

type PostStatus = 'pending' | 'approved' | 'rejected' | 'posted';
type PostRow = {
  id: string;
  hook: string;
  status: PostStatus;
  scheduled_at: string | null;
  posted_at: string | null;
  engagement_count: number;
  created_at?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/30',
  approved: 'bg-[#4F6DFF]/20 text-[#4F6DFF] border-[#4F6DFF]/30',
  rejected: 'bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30',
  posted: 'bg-[#27C696]/20 text-[#27C696] border-[#27C696]/30',
};

function formatScheduleTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | null>(null);
  const [connectionLastSync, setConnectionLastSync] = useState<string | null>(null);

  // Realtime posts for this user
  useEffect(() => {
    if (!user?.id) {
      setPostsLoading(false);
      return;
    }
    let cancelled = false;
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, hook, status, scheduled_at, posted_at, engagement_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!cancelled && data) setPosts(data as PostRow[]);
      setPostsLoading(false);
    };
    fetchPosts();
    const channel = supabase
      .channel('dashboard-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${user.id}` }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // LinkedIn connection status from Supabase (realtime)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const fetchConnection = async () => {
      const { data } = await supabase
        .from('linkedin_connections')
        .select('li_at_cookie, last_connected_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) {
        const connected = !!(data.li_at_cookie && data.li_at_cookie.length > 10);
        setConnectionStatus(connected ? 'connected' : 'disconnected');
        setConnectionLastSync(data.last_connected_at ?? null);
      } else {
        setConnectionStatus('disconnected');
        setConnectionLastSync(null);
      }
    };
    fetchConnection();
    const channel = supabase
      .channel('dashboard-linkedin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_connections', filter: `user_id=eq.${user.id}` }, () => {
        fetchConnection();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = posts.length;
    const pending = posts.filter((p) => p.status === 'pending').length;
    const published = posts.filter((p) => p.status === 'posted').length;
    const engagements = posts.reduce((sum, p) => sum + (p.engagement_count || 0), 0);
    return [
      { label: 'Posts Generated', value: String(total), icon: FileText, color: '#4F6DFF' },
      { label: 'Pending Approval', value: String(pending), icon: Clock, color: '#FFD166' },
      { label: 'Published', value: String(published), icon: Send, color: '#27C696' },
      { label: 'Engagements', value: String(engagements), icon: Heart, color: '#FF6B6B' },
    ];
  }, [posts]);

  const chartData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach((d) => (dayCounts[d] = 0));
    posts.forEach((p) => {
      const created = (p as { created_at?: string }).created_at;
      if (created) {
        const day = new Date(created).toLocaleDateString('en-US', { weekday: 'short' });
        dayCounts[day] = (dayCounts[day] ?? 0) + 1;
      }
    });
    return days.map((day) => ({ day, posts: dayCounts[day] || 0 }));
  }, [posts]);

  const recentPosts = useMemo(() => posts.slice(0, 5), [posts]);

  const upcomingSchedule = useMemo(() => {
    const now = new Date().toISOString();
    return posts
      .filter((p) => p.status === 'approved' && p.scheduled_at && p.scheduled_at > now)
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
      .slice(0, 5)
      .map((p) => ({ time: formatScheduleTime(p.scheduled_at), post: p.hook }));
  }, [posts]);

  return (
    <div className="space-y-8">
      {/* Getting Started banner */}
      {!postsLoading && (posts.length === 0 || connectionStatus === 'disconnected') && (
        <div className="glass-card p-6 border border-[#4F6DFF]/30">
          <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">Getting started</h3>
          <p className="text-sm text-[#A7B1D8] mb-4">Complete these steps to start publishing with PostPilot.</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[#F2F5FF]">
              <span className="text-[#27C696]" aria-hidden>✅</span> Account created
            </li>
            <li className={`flex items-center gap-2 ${connectionStatus === 'connected' ? 'text-[#F2F5FF]' : 'text-[#A7B1D8]'}`}>
              <span className={connectionStatus === 'connected' ? 'text-[#27C696]' : 'text-[#A7B1D8]'} aria-hidden>{connectionStatus === 'connected' ? '✅' : '⬜'}</span>
              Connect LinkedIn (add your cookie in Settings)
              {connectionStatus !== 'connected' && (
                <Link to="/dashboard/settings" className="text-[#4F6DFF] hover:underline ml-1">Connect →</Link>
              )}
            </li>
            <li className={`flex items-center gap-2 ${posts.length > 0 ? 'text-[#F2F5FF]' : 'text-[#A7B1D8]'}`}>
              <span className={posts.length > 0 ? 'text-[#27C696]' : 'text-[#A7B1D8]'} aria-hidden>{posts.length > 0 ? '✅' : '⬜'}</span>
              First post generated (we create drafts for you automatically)
              {posts.length === 0 && connectionStatus === 'connected' && (
                <span className="text-[#A7B1D8] ml-1">— check back in the morning</span>
              )}
            </li>
          </ul>
          {connectionStatus !== 'connected' && (
            <Link to="/dashboard/settings" className="inline-block mt-4">
              <Button className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">Connect LinkedIn in Settings</Button>
            </Link>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F2F5FF]">Dashboard</h1>
          <p className="text-[#A7B1D8] mt-1 text-sm">Your posts, schedule, and connection status at a glance.</p>
        </div>
        <Link to="/dashboard/posts/activity">
          <Button className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
            <FileText className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Stats Grid - realtime from Supabase */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {postsLoading ? (
          <div className="col-span-full flex items-center gap-2 text-[#A7B1D8]">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading stats...
          </div>
        ) : (
          stats.map((stat) => (
            <div key={stat.label} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#A7B1D8]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#F2F5FF] mt-1">{stat.value}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <span className="text-sm text-[#A7B1D8]">Updates from your posts</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Chart - realtime from posts */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#F2F5FF]">Posts by day</h3>
              <p className="text-sm text-[#A7B1D8] mt-0.5">When your posts were created this week</p>
            </div>
            <Badge variant="outline" className="border-white/10 text-[#A7B1D8]">
              <TrendingUp className="w-3 h-3 mr-1 text-[#27C696]" />
              Live
            </Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#A7B1D8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#A7B1D8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1022',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#F2F5FF' }}
                  itemStyle={{ color: '#4F6DFF' }}
                />
                <Line
                  type="monotone"
                  dataKey="posts"
                  stroke="#4F6DFF"
                  strokeWidth={2}
                  dot={{ fill: '#4F6DFF', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#4F6DFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LinkedIn Connection Status - from Supabase */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">LinkedIn connection</h3>
          <p className="text-sm text-[#A7B1D8] mb-4">Your session is used to post and engage on your behalf.</p>
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                connectionStatus === 'connected'
                  ? 'bg-[#27C696]/20'
                  : 'bg-[#FF6B6B]/20'
              }`}
            >
              <Link2
                className={`w-7 h-7 ${
                  connectionStatus === 'connected' ? 'text-[#27C696]' : 'text-[#FF6B6B]'
                }`}
              />
            </div>
            <div>
              <p className="font-medium text-[#F2F5FF]">
                {connectionStatus === null ? '…' : connectionStatus === 'connected' ? 'Connected' : 'Not connected'}
              </p>
              <p className="text-sm text-[#A7B1D8]">
                {connectionStatus === 'connected' && connectionLastSync
                  ? `Last synced: ${formatScheduleTime(connectionLastSync)}`
                  : connectionStatus === 'disconnected'
                    ? 'Connect in Settings → LinkedIn'
                    : '…'}
              </p>
            </div>
          </div>
          <Link to="/dashboard/settings">
            <Button
              variant="outline"
              className="w-full border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {connectionStatus === 'connected' ? 'Manage in Settings' : 'Connect in Settings'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF]">Recent Posts</h3>
            <Link to="/dashboard/posts">
              <Button variant="ghost" className="text-[#4F6DFF] hover:text-[#4F6DFF] hover:bg-[#4F6DFF]/10">
                View all
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {postsLoading ? (
              <div className="flex items-center gap-2 text-[#A7B1D8] py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading posts...
              </div>
            ) : recentPosts.length === 0 ? (
              <p className="text-[#A7B1D8] py-4 text-sm">No posts yet. Head to Posts to create or review drafts.</p>
            ) : (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F2F5FF] font-medium truncate">{post.hook}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${statusColors[post.status]}`}
                      >
                        {post.status}
                      </Badge>
                      {(post.posted_at || post.scheduled_at) && (
                        <span className="text-xs text-[#A7B1D8]">
                          {formatScheduleTime(post.posted_at ?? post.scheduled_at)}
                        </span>
                      )}
                      {post.engagement_count > 0 && (
                        <span className="text-xs text-[#A7B1D8]">{post.engagement_count} engagements</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/dashboard/posts/activity?id=${post.id}`}>
                      <button className="p-2 rounded-lg hover:bg-white/10 text-[#A7B1D8] hover:text-[#F2F5FF]" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link to={`/dashboard/posts/activity?id=${post.id}`}>
                      <button className="p-2 rounded-lg hover:bg-white/10 text-[#A7B1D8] hover:text-[#F2F5FF]" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      className="p-2 rounded-lg hover:bg-white/10 text-[#A7B1D8] hover:text-[#FF6B6B]"
                      title="Delete"
                      onClick={async () => {
                        if (!confirm('Delete this post?')) return;
                        await supabase.from('posts').delete().eq('id', post.id);
                        setPosts((prev) => prev.filter((p) => p.id !== post.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#F2F5FF]">Upcoming Schedule</h3>
            <Link to="/dashboard/posts/activity">
              <Button variant="ghost" className="text-[#4F6DFF] hover:text-[#4F6DFF] hover:bg-[#4F6DFF]/10">
                View schedule
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingSchedule.length === 0 ? (
              <div className="py-4">
                <p className="text-[#A7B1D8] mb-3 text-sm">No upcoming scheduled posts. Set your preferred days and times in Posts → Settings.</p>
                <Link to="/dashboard/posts/settings" className="text-[#4F6DFF] hover:underline text-sm font-medium">
                  Set up schedule →
                </Link>
              </div>
            ) : (
              upcomingSchedule.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#4F6DFF]/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-[#4F6DFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F2F5FF] font-medium truncate">{item.post}</p>
                    <p className="text-sm text-[#A7B1D8]">{item.time}</p>
                  </div>
                  <Link to="/dashboard/posts">
                    <button className="p-2 rounded-lg hover:bg-white/10 text-[#A7B1D8] hover:text-[#F2F5FF]">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              ))
            )}
          </div>
          <Link to="/dashboard/posts/settings">
            <Button
              variant="outline"
              className="w-full mt-4 border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Manage Schedule
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

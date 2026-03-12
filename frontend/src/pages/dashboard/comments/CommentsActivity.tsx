import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Reply, Loader2, List } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

type LogRow = {
  id: string;
  created_at: string;
  action: 'like' | 'comment' | 'reply';
  post_uri: string;
  comment_text: string | null;
  status: string;
};

const PAGE_SIZE = 10;

export default function CommentsActivity() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'comment' | 'reply'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('engagement_logs')
        .select('id, created_at, action, post_uri, comment_text, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (!cancelled && data) setLogs(data as LogRow[]);
      setLoading(false);
    };
    fetchLogs();
    const channel = supabase
      .channel('comments-activity-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_logs', filter: `user_id=eq.${user.id}` }, () => {
        fetchLogs();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (activeTab !== 'all') list = list.filter((l) => l.action === activeTab);
    if (statusFilter === 'success') list = list.filter((l) => (l.status || '').toLowerCase() === 'success' || (l.status || '').toLowerCase() === 'completed');
    if (statusFilter === 'failed') list = list.filter((l) => (l.status || '').toLowerCase() === 'failed' || (l.status || '').toLowerCase() === 'error');
    return list;
  }, [logs, activeTab, statusFilter]);

  const paginatedLogs = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;

  function truncate(str: string, len: number) {
    if (!str) return '—';
    return str.length <= len ? str : str.slice(0, len) + '…';
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  const actionIcons = { like: Heart, comment: MessageSquare, reply: Reply };
  const actionColors: Record<string, string> = {
    like: 'bg-[#E11D48]/20 text-[#E11D48] border-[#E11D48]/30',
    comment: 'bg-[#4F6DFF]/20 text-[#4F6DFF] border-[#4F6DFF]/30',
    reply: 'bg-[#27C696]/20 text-[#27C696] border-[#27C696]/30',
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Full-width header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <List className="w-5 h-5 text-[#4F6DFF] shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-[#F2F5FF]">Engagement activity</h3>
            <p className="text-sm text-[#A7B1D8]">Likes, comments, and replies from automation</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setPage(0); }}>
        {/* Filters row: type + status in one line */}
        <div className="flex flex-wrap items-center gap-4">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto">
            <TabsTrigger value="all" className="capitalize px-4 py-2 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#A7B1D8]">
              All
            </TabsTrigger>
            <TabsTrigger value="like" className="capitalize px-4 py-2 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#A7B1D8]">
              <Heart className="w-4 h-4 mr-1" /> Likes
            </TabsTrigger>
            <TabsTrigger value="comment" className="capitalize px-4 py-2 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#A7B1D8]">
              <MessageSquare className="w-4 h-4 mr-1" /> Comments
            </TabsTrigger>
            <TabsTrigger value="reply" className="capitalize px-4 py-2 rounded-lg data-[state=active]:bg-[#4F6DFF] data-[state=active]:text-white text-[#A7B1D8]">
              <Reply className="w-4 h-4 mr-1" /> Replies
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="text-sm text-[#A7B1D8]">Status:</span>
            {(['all', 'success', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-[#4F6DFF] text-white' : 'bg-white/5 text-[#A7B1D8] hover:bg-white/10'
                }`}
              >
                {s === 'all' ? 'All' : s === 'success' ? 'Success' : 'Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Full-width table area */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden mt-4">
          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="flex items-center gap-2 text-[#A7B1D8] py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left p-3 text-[#A7B1D8] font-medium">Time</th>
                        <th className="text-left p-3 text-[#A7B1D8] font-medium">Type</th>
                        <th className="text-left p-3 text-[#A7B1D8] font-medium">Post</th>
                        <th className="text-left p-3 text-[#A7B1D8] font-medium">Text</th>
                        <th className="text-left p-3 text-[#A7B1D8] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((row) => {
                        const Icon = actionIcons[row.action];
                        return (
                          <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3 text-[#F2F5FF] whitespace-nowrap">{formatDate(row.created_at)}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={`capitalize ${actionColors[row.action] || ''}`}>
                                <Icon className="w-3 h-3 mr-1" /> {row.action}
                              </Badge>
                            </td>
                            <td className="p-3 text-[#A7B1D8] font-mono text-xs max-w-[280px] truncate">{truncate(row.post_uri, 50)}</td>
                            <td className="p-3 text-[#F2F5FF] max-w-[240px] truncate">{row.comment_text || '—'}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {row.status || 'completed'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {paginatedLogs.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[#A7B1D8] mb-4">No engagement activity yet. Enable auto-like or auto-comment in Settings to get started.</p>
                    <Link to="/dashboard/comments/settings">
                      <Button className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">Go to Settings →</Button>
                    </Link>
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-white/10 bg-white/[0.02]">
                    <p className="text-sm text-[#A7B1D8]">
                      Page {page + 1} of {totalPages} ({filteredLogs.length} total)
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-[#F2F5FF] disabled:opacity-50 hover:bg-white/10"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-[#F2F5FF] disabled:opacity-50 hover:bg-white/10"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

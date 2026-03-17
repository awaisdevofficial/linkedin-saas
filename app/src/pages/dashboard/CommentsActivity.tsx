import { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Reply, 
  CheckCircle, 
  XCircle,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const activityData = [
  { id: 1, type: 'like', post: 'The future of AI...', text: 'Liked post', status: 'success', time: '2 hours ago' },
  { id: 2, type: 'comment', post: '5 tips for LinkedIn...', text: 'Great tips! Thanks for sharing.', status: 'success', time: '3 hours ago' },
  { id: 3, type: 'reply', post: 'Why consistency...', text: 'Reply: Totally agree!', status: 'success', time: '4 hours ago' },
  { id: 4, type: 'like', post: 'My journey from 0...', text: 'Liked post', status: 'failed', time: '5 hours ago' },
  { id: 5, type: 'comment', post: 'The 80/20 rule...', text: 'Very insightful post', status: 'success', time: '6 hours ago' },
  { id: 6, type: 'reply', post: 'AI in marketing...', text: 'Reply: Could you elaborate?', status: 'success', time: '8 hours ago' },
];

const CommentsActivity = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = activityData.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = item.post.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesStatus && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'reply': return <Reply className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'success' 
      ? <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>
      : <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#10153E]">Engagement Activity</h1>
        <p className="text-sm text-[#6B7098]">Track likes, comments, and replies from automation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[#6B7098]">Likes</p>
              <p className="text-xl font-bold text-[#10153E]">234</p>
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
              <p className="text-xl font-bold text-[#10153E]">89</p>
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
              <p className="text-xl font-bold text-[#10153E]">45</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Time</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Text</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm text-[#6B7098]">{item.time}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <span className="text-sm capitalize">{item.type}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-[#10153E]">{item.post}</TableCell>
                <TableCell className="text-sm text-[#6B7098]">{item.text}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7098]">Showing {filteredData.length} of {activityData.length} entries</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" disabled>Previous</Button>
          <Button variant="outline" size="sm" className="rounded-full" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default CommentsActivity;

import { useState } from 'react';
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
  Calendar,
  Clock
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

const initialPosts = [
  { id: 1, hook: 'The future of AI in content marketing is here...', content: 'Full post content here...', hashtags: '#AI #Marketing', status: 'published', date: '2024-03-10', engagements: 45 },
  { id: 2, hook: '5 tips for better LinkedIn engagement', content: 'Full post content here...', hashtags: '#LinkedIn #Tips', status: 'pending', date: '2024-03-12', engagements: 0 },
  { id: 3, hook: 'Why consistency beats virality every time', content: 'Full post content here...', hashtags: '#Consistency #Growth', status: 'approved', date: '2024-03-15', engagements: 0 },
  { id: 4, hook: 'My journey from 0 to 10K followers', content: 'Full post content here...', hashtags: '#Growth #Story', status: 'published', date: '2024-03-08', engagements: 128 },
  { id: 5, hook: 'The 80/20 rule of content creation', content: 'Full post content here...', hashtags: '#Productivity #Content', status: 'rejected', date: '2024-03-05', engagements: 0 },
];

const PostsActivity = () => {
  const [posts, setPosts] = useState(initialPosts);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPostDialogOpen, setIsNewPostDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const [autoReply, setAutoReply] = useState(true);

  const [newPost, setNewPost] = useState({
    hook: '',
    content: '',
    hashtags: '',
    generateImage: false,
  });

  const filteredPosts = posts.filter(post => {
    const matchesTab = activeTab === 'all' || post.status === activeTab;
    const matchesSearch = post.hook.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      published: 'bg-green-100 text-green-700 hover:bg-green-100',
      pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      approved: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const handleCreatePost = () => {
    const post = {
      id: posts.length + 1,
      ...newPost,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      engagements: 0,
    };
    setPosts([post, ...posts]);
    setNewPost({ hook: '', content: '', hashtags: '', generateImage: false });
    setIsNewPostDialogOpen(false);
  };

  const handleUpdatePost = () => {
    if (!selectedPost) return;
    setPosts(posts.map(p => p.id === selectedPost.id ? selectedPost : p));
    setIsEditDialogOpen(false);
    setSelectedPost(null);
  };

  const handleDeletePost = (id: number) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  const handleDuplicatePost = (post: any) => {
    const duplicated = {
      ...post,
      id: posts.length + 1,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      engagements: 0,
    };
    setPosts([duplicated, ...posts]);
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#10153E]">Posts Activity</h1>
          <p className="text-sm text-[#6B7098]">Manage and schedule your LinkedIn posts</p>
        </div>
        <Button 
          className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full"
          onClick={() => setIsNewPostDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl card-shadow">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
            <Label className="text-sm text-[#6B7098]">Auto-publish</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            <Label className="text-sm text-[#6B7098]">Auto-reply</Label>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B7098]">
          <Clock className="w-4 h-4" />
          Generation: Active
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="published">Posted</TabsTrigger>
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

      {/* Posts List */}
      <div className="space-y-3">
        {filteredPosts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl p-5 card-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-[#10153E]">{post.hook}</h3>
                  <Badge className={getStatusBadge(post.status)}>
                    {post.status}
                  </Badge>
                </div>
                <p className="text-sm text-[#6B7098] line-clamp-2 mb-2">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-[#6B7098]">
                  <span>{post.hashtags}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                  {post.engagements > 0 && (
                    <>
                      <span>•</span>
                      <span>{post.engagements} engagements</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {post.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => handleStatusChange(post.id, 'approved')}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setIsScheduleDialogOpen(true)}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedPost(post); setIsEditDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicatePost(post)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-600">
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
                onCheckedChange={(checked) => setNewPost({ ...newPost, generateImage: checked as boolean })}
              />
              <Label className="text-sm">Generate AI image</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPostDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" onClick={handleCreatePost}>Create Post</Button>
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
                  value={selectedPost.hashtags}
                  onChange={(e) => setSelectedPost({ ...selectedPost, hashtags: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#2D5AF6] hover:bg-[#1E4AD6]" onClick={handleUpdatePost}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#2D5AF6] hover:bg-[#1E4AD6]">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostsActivity;

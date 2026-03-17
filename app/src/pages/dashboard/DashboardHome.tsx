import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Heart, 
  MessageCircle, 
  TrendingUp,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const stats = [
  { label: 'Posts Generated', value: '124', icon: FileText, change: '+12%', color: 'blue' },
  { label: 'Pending Approval', value: '8', icon: Clock, change: '2 new', color: 'amber' },
  { label: 'Published', value: '96', icon: CheckCircle, change: 'This month', color: 'green' },
  { label: 'Engagements', value: '2.4K', icon: Heart, change: '+18%', color: 'purple' },
];

const recentPosts = [
  { id: 1, hook: 'The future of AI in content marketing...', status: 'published', date: '2 hours ago', engagements: 45 },
  { id: 2, hook: '5 tips for better LinkedIn engagement', status: 'pending', date: 'Scheduled for tomorrow', engagements: 0 },
  { id: 3, hook: 'Why consistency beats virality', status: 'approved', date: 'Scheduled for Friday', engagements: 0 },
  { id: 4, hook: 'My journey from 0 to 10K followers', status: 'published', date: '3 days ago', engagements: 128 },
];

const activityFeed = [
  { id: 1, type: 'post', message: 'Post published successfully', time: '2 hours ago', icon: CheckCircle },
  { id: 2, type: 'comment', message: 'Comment replied to on "AI in marketing"', time: '4 hours ago', icon: MessageCircle },
  { id: 3, type: 'engagement', message: 'New follower: +12 today', time: '6 hours ago', icon: TrendingUp },
  { id: 4, type: 'draft', message: 'Draft created: "5 tips for..."', time: '8 hours ago', icon: FileText },
];

const quickStats = [
  { label: 'Likes given', value: '234' },
  { label: 'Comments made', value: '89' },
  { label: 'Replies sent', value: '45' },
  { label: 'Posts this week', value: '12' },
];

const DashboardHome = () => {
  const [linkedInConnected] = useState(true);

  const getStatusBadge = (status: string) => {
    const styles = {
      published: 'bg-green-100 text-green-700 hover:bg-green-100',
      pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      approved: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="card-shadow border-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#6B7098]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#10153E] mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'amber' ? 'bg-amber-100' :
                  stat.color === 'green' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  <stat.icon className={`w-5 h-5 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'amber' ? 'text-amber-600' :
                    stat.color === 'green' ? 'text-green-600' : 'text-purple-600'
                  }`} />
                </div>
              </div>
              <p className={`text-xs mt-3 ${
                stat.change.startsWith('+') ? 'text-green-600' : 'text-[#6B7098]'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-2 card-shadow border-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#10153E]">Activity Feed</CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F6F8FC] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#2D5AF6]/10 flex items-center justify-center flex-shrink-0">
                    <activity.icon className="w-4 h-4 text-[#2D5AF6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#10153E]">{activity.message}</p>
                    <p className="text-xs text-[#6B7098] mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Connection & Quick Stats */}
        <div className="space-y-6">
          {/* LinkedIn Status */}
          <Card className="card-shadow border-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-[#10153E]">LinkedIn Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${linkedInConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-[#10153E]">
                  {linkedInConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              {linkedInConnected && (
                <p className="text-xs text-[#6B7098]">Last synced: 5 minutes ago</p>
              )}
              <Link to="/dashboard/settings">
                <Button variant="outline" className="w-full mt-4 rounded-full border-[#6B7098]/20">
                  Manage Connection
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Stats */}
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

      {/* Recent Posts */}
      <Card className="card-shadow border-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-[#10153E]">Recent Posts</CardTitle>
            <Link to="/dashboard/posts/activity" className="text-sm text-[#2D5AF6] hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 rounded-xl bg-[#F6F8FC]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#10153E] truncate">{post.hook}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge className={getStatusBadge(post.status)}>
                      {post.status}
                    </Badge>
                    <span className="text-xs text-[#6B7098]">{post.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  {post.engagements > 0 && (
                    <div className="flex items-center gap-1 text-sm text-[#6B7098]">
                      <Heart className="w-4 h-4" />
                      {post.engagements}
                    </div>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-white transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-[#6B7098]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;

import { Outlet, NavLink, Link } from 'react-router-dom';
import { Sparkles, List, Settings } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function PostsLayout() {
  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F2F5FF]">Posts</h1>
          <p className="text-[#A7B1D8] mt-1 text-sm">Create, schedule, and review your LinkedIn posts.</p>
        </div>
        <Link to="/dashboard/posts/activity?new=1">
          <Button className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate New Post
          </Button>
        </Link>
      </div>

      <nav className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        <NavLink
          to="/dashboard/posts/activity"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-[#4F6DFF] text-white' : 'text-[#A7B1D8] hover:bg-white/5 hover:text-[#F2F5FF]'
            }`
          }
        >
          <List className="w-4 h-4" />
          Activity
        </NavLink>
        <NavLink
          to="/dashboard/posts/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-[#4F6DFF] text-white' : 'text-[#A7B1D8] hover:bg-white/5 hover:text-[#F2F5FF]'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

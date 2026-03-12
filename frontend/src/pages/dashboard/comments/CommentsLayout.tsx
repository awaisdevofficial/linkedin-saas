import { Outlet, NavLink } from 'react-router-dom';
import { List, Settings } from 'lucide-react';

export default function CommentsLayout() {
  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#F2F5FF]">Comments</h1>
        <p className="text-[#A7B1D8] mt-1 text-sm">Review and manage automated comments on your feed.</p>
      </div>

      <nav className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        <NavLink
          to="/dashboard/comments/activity"
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
          to="/dashboard/comments/settings"
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

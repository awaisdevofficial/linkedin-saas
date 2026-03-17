import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LayoutDashboard, Calendar, MessageSquare, Settings, Bell, Search } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const DashboardPreview = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const card = cardRef.current;

    if (!section || !header || !card) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(header,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: header,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      gsap.fromTo(card,
        { y: 50, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#F6F8FC] py-24 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-10">
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#2D5AF6] font-medium mb-4">
            Dashboard
          </p>
          <h2 className="text-[clamp(32px,3.6vw,52px)] font-bold text-[#10153E] mb-4">
            Everything at a glance.
          </h2>
          <p className="text-lg text-[#6B7098] max-w-[500px]">
            See your schedule, approvals, and engagement in one calm, focused view.
          </p>
        </div>

        {/* Dashboard Card */}
        <div 
          ref={cardRef}
          className="bg-white rounded-[28px] overflow-hidden card-shadow border border-[#6B7098]/10"
        >
          {/* Mock Dashboard UI */}
          <div className="flex h-[500px] lg:h-[600px]">
            {/* Sidebar */}
            <div className="hidden sm:flex w-64 bg-[#F6F8FC] flex-col p-6 border-r border-[#6B7098]/10">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PP</span>
                </div>
                <span className="font-semibold text-[#10153E]">PostPilot</span>
              </div>
              
              <nav className="space-y-1 flex-1">
                {[
                  { icon: LayoutDashboard, label: 'Dashboard', active: true },
                  { icon: Calendar, label: 'Posts', active: false },
                  { icon: MessageSquare, label: 'Comments', active: false },
                  { icon: Settings, label: 'Settings', active: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                      item.active 
                        ? 'bg-[#2D5AF6] text-white' 
                        : 'text-[#6B7098] hover:bg-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#6B7098]/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7098]" />
                  <input 
                    type="text"
                    placeholder="Search posts, comments..."
                    className="pl-10 pr-4 py-2 rounded-full bg-[#F6F8FC] text-sm text-[#10153E] placeholder:text-[#6B7098]/60 w-64 focus:outline-none focus:ring-2 focus:ring-[#2D5AF6]/20"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button className="relative p-2 rounded-full hover:bg-[#F6F8FC]">
                    <Bell className="w-5 h-5 text-[#6B7098]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#2D5AF6] rounded-full" />
                  </button>
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img src="/images/avatar-1.jpg" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-[#10153E] mb-1">Dashboard</h3>
                  <p className="text-sm text-[#6B7098]">Your posts, schedule, and connection status at a glance.</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Posts Generated', value: '124', change: '+12%' },
                    { label: 'Pending Approval', value: '8', change: '2 new' },
                    { label: 'Published', value: '96', change: 'This month' },
                    { label: 'Engagements', value: '2.4K', change: '+18%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#F6F8FC] rounded-2xl p-4">
                      <p className="text-xs text-[#6B7098] mb-1">{stat.label}</p>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-[#10153E]">{stat.value}</span>
                        <span className="text-xs text-[#27C696] font-medium">{stat.change}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-[#F6F8FC] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-[#10153E]">Recent Activity</h4>
                    <span className="text-xs text-[#2D5AF6] cursor-pointer">View all</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { action: 'Post published', time: '2 hours ago', status: 'success' },
                      { action: 'Comment replied', time: '4 hours ago', status: 'success' },
                      { action: 'Draft created', time: '6 hours ago', status: 'pending' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === 'success' ? 'bg-[#27C696]' : 'bg-[#FFD166]'
                          }`} />
                          <span className="text-sm text-[#10153E]">{activity.action}</span>
                        </div>
                        <span className="text-xs text-[#6B7098]">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;

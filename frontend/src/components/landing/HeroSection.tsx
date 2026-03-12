import { Link } from 'react-router-dom';
import { Play, Calendar, TrendingUp, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const avatars = [
  '/images/avatar-1.jpg',
  '/images/avatar-2.jpg',
  '/images/avatar-3.jpg',
  '/images/avatar-4.jpg',
  '/images/avatar-5.jpg',
  '/images/avatar-6.jpg',
];

const statCards = [
  { icon: Calendar, label: 'Scheduled', value: '24 posts', position: 'right-[34vw] top-[22vh]' },
  { icon: TrendingUp, label: 'Engagement', value: '+47%', position: 'right-[10vw] top-[30vh]' },
  { icon: MessageCircle, label: 'Comments', value: '128 today', position: 'right-[30vw] top-[66vh]' },
  { icon: Users, label: 'New followers', value: '+892', position: 'right-[8vw] top-[62vh]' },
];

const HeroSection = () => {
  return (
    <section className="relative w-full h-screen bg-[#F6F8FC] overflow-hidden">
      {/* Dot pattern background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />

      {/* Glow effect */}
      <div
        className="absolute right-[20vw] top-1/2 -translate-y-1/2 w-[60vw] h-[60vw] pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(79,109,255,0.12), transparent 65%)',
        }}
      />

      {/* Content */}
      <div className="absolute left-[7vw] top-1/2 -translate-y-1/2 w-[44vw] max-w-[600px] z-10">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#4F6DFF] font-medium">
            LinkedIn Automation
          </span>
        </div>

        <h1 className="text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-6 leading-[1.05]">
          <span className="block">Your LinkedIn content studio,</span>
          <span className="block text-gradient">on autopilot.</span>
        </h1>

        <p className="text-lg text-[#6B7098] mb-8 max-w-[400px] leading-relaxed">
          Schedule posts, engage smarter, and grow your presence—with AI that sounds like you.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link to="/auth/signup">
            <Button
              size="lg"
              className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-full px-8 h-12 text-base font-medium"
            >
              Start free trial
            </Button>
          </Link>
          <button className="flex items-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors group">
            <span className="w-10 h-10 rounded-full border border-[#6B7098]/30 flex items-center justify-center group-hover:border-[#4F6DFF] group-hover:bg-[#4F6DFF]/5 transition-all">
              <Play className="w-4 h-4 ml-0.5" />
            </span>
            <span className="text-sm font-medium">Watch a 2-min demo</span>
          </button>
        </div>
      </div>

      {/* Orbit Ring */}
      <div className="absolute right-[6vw] top-1/2 -translate-y-1/2 w-[min(52vw,760px)] h-[min(52vw,760px)]">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#6B7098]/25" />

        {avatars.map((avatar, i) => {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          const radius = 50;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={i}
              className="absolute w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <img
                src={avatar}
                alt={`User ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-2xl">PP</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="absolute inset-0 pointer-events-none">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`absolute bg-white rounded-2xl p-4 card-shadow pointer-events-auto ${card.position}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4F6DFF]/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-[#4F6DFF]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7098] mono uppercase tracking-wider">{card.label}</p>
                <p className="text-lg font-semibold text-[#10153E]">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;

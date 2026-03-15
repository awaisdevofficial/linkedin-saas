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
  { icon: Calendar, label: 'Scheduled', value: '24 posts' },
  { icon: TrendingUp, label: 'Engagement', value: '+47%' },
  { icon: MessageCircle, label: 'Comments', value: '128 today' },
  { icon: Users, label: 'New followers', value: '+892' },
];

const HeroSection = () => {
  return (
    <section className="relative w-full min-h-screen lg:h-screen bg-[#F6F8FC] overflow-hidden flex flex-col lg:block">
      {/* Dot pattern background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />

      {/* Glow effect - hidden on small screens to reduce clutter */}
      <div
        className="hidden lg:block absolute right-[20vw] top-1/2 -translate-y-1/2 w-[60vw] h-[60vw] pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(79,109,255,0.12), transparent 65%)',
        }}
      />

      {/* Content - centered on mobile, left-aligned on desktop */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 pt-24 pb-8 lg:pt-0 lg:pb-0 lg:absolute lg:left-[7vw] lg:top-1/2 lg:-translate-y-1/2 lg:w-[44vw] lg:max-w-[600px] lg:px-0">
        <div className="inline-flex items-center gap-2 mb-4 lg:mb-6">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#4F6DFF] font-medium">
            LinkedIn Automation
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-4 lg:mb-6 leading-[1.1] text-center lg:text-left">
          <span className="block">Your LinkedIn content studio,</span>
          <span className="block text-gradient">on autopilot.</span>
        </h1>

        <p className="text-base sm:text-lg text-[#6B7098] mb-6 lg:mb-8 max-w-[400px] leading-relaxed text-center lg:text-left mx-auto lg:mx-0">
          Schedule posts, engage smarter, and grow your presence—with AI that sounds like you.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
          <Link to="/auth/signup" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-full px-8 h-12 text-base font-medium min-h-[48px]"
            >
              Start free trial
            </Button>
          </Link>
          <button
            type="button"
            className="flex items-center justify-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors group min-h-[48px] px-4 py-3 rounded-full touch-manipulation"
            aria-label="Watch a 2-min demo"
          >
            <span className="w-10 h-10 rounded-full border border-[#6B7098]/30 flex items-center justify-center group-hover:border-[#4F6DFF] group-hover:bg-[#4F6DFF]/5 transition-all shrink-0">
              <Play className="w-4 h-4 ml-0.5" />
            </span>
            <span className="text-sm font-medium">Watch a 2-min demo</span>
          </button>
        </div>
      </div>

      {/* Orbit Ring - hidden on small mobile; compact on tablet; full on desktop */}
      <div className="hidden sm:flex absolute right-[6vw] top-1/2 -translate-y-1/2 w-[min(52vw,760px)] h-[min(52vw,760px)] sm:w-[220px] sm:h-[220px] lg:w-[min(52vw,760px)] lg:h-[min(52vw,760px)]">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#6B7098]/25" />

        {avatars.map((avatar, i) => {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          const radius = 50;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={i}
              className="absolute w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <img
                src={avatar}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          );
        })}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-lg sm:text-xl lg:text-2xl">PP</span>
          </div>
        </div>
      </div>

      {/* Stat Cards - grid on mobile, absolute on desktop */}
      <div className="relative z-10 px-4 sm:px-6 lg:absolute lg:inset-0 lg:pointer-events-none lg:px-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:hidden max-w-md mx-auto">
          {statCards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 card-shadow pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4F6DFF]/10 flex items-center justify-center shrink-0">
                  <card.icon className="w-5 h-5 text-[#4F6DFF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#6B7098] mono uppercase tracking-wider truncate">{card.label}</p>
                  <p className="text-base sm:text-lg font-semibold text-[#10153E] truncate">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop-only absolute stat cards */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          {[
            { ...statCards[0], position: 'right-[34vw] top-[22vh]' },
            { ...statCards[1], position: 'right-[10vw] top-[30vh]' },
            { ...statCards[2], position: 'right-[30vw] top-[66vh]' },
            { ...statCards[3], position: 'right-[8vw] top-[62vh]' },
          ].map((card, i) => (
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
      </div>
    </section>
  );
};

export default HeroSection;

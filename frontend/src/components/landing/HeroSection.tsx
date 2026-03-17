import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Calendar, TrendingUp, MessageCircle, UserPlus, Lightbulb, Send, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostoraLogo } from '@/components/PostoraLogo';
import { gsap } from 'gsap';

const avatars = [
  '/images/avatar-1.jpg',
  '/images/avatar-2.jpg',
  '/images/avatar-3.jpg',
  '/images/avatar-4.jpg',
  '/images/avatar-5.jpg',
  '/images/avatar-6.jpg',
];

const statCards = [
  { icon: Calendar, label: 'Scheduled', value: '24 posts', plus: false },
  { icon: TrendingUp, label: 'Engagement', value: '+47%', plus: true },
  { icon: MessageCircle, label: 'Comments', value: '128 today', plus: false },
  { icon: UserPlus, label: 'New followers', value: '+892', plus: true },
];

const ideaPapers = [
  { label: 'Post', icon: Send },
  { label: 'Like', icon: Heart },
  { label: 'Comment', icon: MessageCircle },
  { label: 'Share', icon: Share2 },
  { label: 'Idea', icon: Lightbulb },
  { label: 'Engage', icon: TrendingUp },
  { label: 'Connect', icon: UserPlus },
  { label: 'Grow', icon: TrendingUp },
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const centerLogoRef = useRef<HTMLDivElement>(null);
  const statCardsRef = useRef<HTMLDivElement>(null);
  const papersContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const left = leftRef.current;
      const ring = ringRef.current;
      const centerLogo = centerLogoRef.current;
      const statCardsEl = statCardsRef.current;
      const papersContainer = papersContainerRef.current;
      const paperEls = papersContainer?.querySelectorAll('.hero-paper');

      if (left) {
        gsap.fromTo(
          [subtitleRef.current, line1Ref.current, line2Ref.current, descRef.current, ctaRef.current].filter(Boolean),
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.2,
            ease: 'power2.out',
          }
        );
      }

      if (ring) {
        gsap.fromTo(ring, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, delay: 0.3, ease: 'back.out(1.2)' });
      }

      const avatarEls = orbitRef.current?.querySelectorAll('.hero-avatar');
      if (avatarEls?.length) {
        gsap.fromTo(
          avatarEls,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, stagger: 0.06, delay: 0.6, ease: 'back.out(1.4)' }
        );
      }

      if (centerLogo) {
        gsap.fromTo(centerLogo, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, delay: 0.5, ease: 'back.out(1.3)' });
      }

      if (statCardsEl) {
        const cards = statCardsEl.querySelectorAll('.hero-stat-card');
        gsap.fromTo(
          cards,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, delay: 1, ease: 'power2.out' }
        );
      }

      if (paperEls?.length && papersContainer) {
        const radius = 56;
        const cloudPositions = ideaPapers.map((_, i) => {
          const angle = (i / ideaPapers.length) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          return {
            left: 50 + radius * Math.cos(rad),
            top: 50 + radius * Math.sin(rad),
            rotation: (i % 5 - 2) * 6,
          };
        });

        const tl = gsap.timeline({ delay: 1.2 });
        paperEls.forEach((el, i) => {
          const pos = cloudPositions[i];
          const angle = (i / ideaPapers.length) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const popOutX = Math.cos(rad) * 8;
          const popOutY = Math.sin(rad) * 8 - 6;
          tl.fromTo(
            el,
            {
              scale: 0,
              opacity: 0,
              xPercent: -50,
              yPercent: -50,
              left: '50%',
              top: '50%',
              rotation: -12 + i * 4,
            },
            {
              scale: 1,
              opacity: 1,
              left: '50%',
              top: '50%',
              xPercent: -50 + popOutX,
              yPercent: -50 + popOutY,
              rotation: pos.rotation * 0.2,
              duration: 0.4,
              ease: 'back.out(1.5)',
            },
            `+=${i * 0.05}`
          );
        });
        tl.add(() => {
          paperEls.forEach((el, i) => {
            const pos = cloudPositions[i];
            gsap.to(el, {
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              xPercent: -50,
              yPercent: -50,
              rotation: pos.rotation,
              duration: 0.7,
              delay: i * 0.04,
              ease: 'power2.inOut',
            });
          });
        }, '+=0.2');
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen lg:h-screen bg-[#F6F8FC] overflow-hidden flex flex-col lg:block"
    >
      {/* Dot pattern background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />

      {/* Glow effect */}
      <div
        className="hidden lg:block absolute right-[20vw] top-1/2 -translate-y-1/2 w-[60vw] h-[60vw] pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(99,102,241,0.12), transparent 65%)',
        }}
      />

      {/* Left content */}
      <div
        ref={leftRef}
        className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 pt-24 pb-8 lg:pt-0 lg:pb-0 lg:absolute lg:left-[7vw] lg:top-1/2 lg:-translate-y-1/2 lg:w-[44vw] lg:max-w-[600px] lg:px-0"
      >
        <div ref={subtitleRef} className="inline-flex items-center gap-2 mb-4 lg:mb-6">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#6366F1] font-medium">
            LinkedIn Content Studio
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-4 lg:mb-6 leading-[1.1] text-center lg:text-left">
          <span ref={line1Ref} className="block">Your LinkedIn content studio,</span>
          <span ref={line2Ref} className="block text-gradient">on autopilot.</span>
        </h1>

        <p
          ref={descRef}
          className="text-base sm:text-lg text-[#6B7098] mb-6 lg:mb-8 max-w-[400px] leading-relaxed text-center lg:text-left mx-auto lg:mx-0"
        >
          Schedule posts, engage smarter, and grow your presence—with AI that sounds like you.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
          <Link to="/auth/signup" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-full px-8 h-12 text-base font-medium min-h-[48px]"
            >
              Start free trial
            </Button>
          </Link>
          <button
            type="button"
            className="flex items-center justify-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors group min-h-[48px] px-4 py-3 rounded-full touch-manipulation"
            aria-label="Watch a 2-min demo"
          >
            <span className="w-10 h-10 rounded-full border border-[#6B7098]/30 flex items-center justify-center group-hover:border-[#6366F1] group-hover:bg-[#6366F1]/5 transition-all shrink-0">
              <Play className="w-4 h-4 ml-0.5" />
            </span>
            <span className="text-sm font-medium">Watch a 2-min demo</span>
          </button>
        </div>
      </div>

      {/* Orbit + avatars + center logo */}
      <div
        ref={orbitRef}
        className="hidden sm:flex absolute right-[6vw] top-1/2 -translate-y-1/2 w-[min(52vw,760px)] h-[min(52vw,760px)] sm:w-[220px] sm:h-[220px] lg:w-[min(52vw,760px)] lg:h-[min(52vw,760px)]"
      >
        <div
          ref={ringRef}
          className="absolute inset-0 rounded-full border-2 border-dashed border-[#6B7098]/25"
        />

        {avatars.map((avatar, i) => {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          const radius = 50;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={i}
              className="hero-avatar absolute w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg"
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

        <div
          ref={centerLogoRef}
          className="absolute inset-0 flex items-center justify-center z-[3]"
        >
          <div className="scale-150 sm:scale-[1.8] lg:scale-[2.2]">
            <PostoraLogo variant="icon" size="lg" />
          </div>
        </div>

        {/* Papers: pop up on top of center Postora logo, then attach as idea cloud */}
        <div
          ref={papersContainerRef}
          className="absolute inset-0 pointer-events-none z-[6]"
        >
          {ideaPapers.map((paper, i) => {
            const Icon = paper.icon;
            return (
              <div
                key={i}
                className="hero-paper absolute left-1/2 top-1/2 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-white border border-[#6B7098]/20 shadow-md whitespace-nowrap -translate-x-1/2 -translate-y-1/2 opacity-0"
                style={{ willChange: 'transform' }}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6366F1] shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-[#10153E]">{paper.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engagement stats - animated cards with plus etc */}
      <div
        ref={statCardsRef}
        className="relative z-10 px-4 sm:px-6 lg:absolute lg:inset-0 lg:pointer-events-none lg:px-0"
      >
        {/* Mobile: grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:hidden max-w-md mx-auto">
          {statCards.map((card, i) => (
            <div
              key={i}
              className="hero-stat-card bg-white/95 backdrop-blur rounded-2xl p-4 card-shadow border border-[#6B7098]/8"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                  <card.icon className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#6B7098] mono uppercase tracking-wider truncate">{card.label}</p>
                  <p className="text-base sm:text-lg font-semibold text-[#10153E] truncate">
                    {card.plus && !card.value.startsWith('+') ? `+${card.value}` : card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: floating cards – close to orbit */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          {[
            { ...statCards[0], position: 'right-[28vw] top-[24vh]' },
            { ...statCards[1], position: 'right-[16vw] top-[32vh]' },
            { ...statCards[2], position: 'right-[26vw] top-[64vh]' },
            { ...statCards[3], position: 'right-[14vw] top-[60vh]' },
          ].map((card, i) => (
            <div
              key={i}
              className={`hero-stat-card absolute bg-white/95 backdrop-blur rounded-2xl p-4 card-shadow border border-[#6B7098]/8 pointer-events-auto ${card.position}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-xs text-[#6B7098] mono uppercase tracking-wider">{card.label}</p>
                  <p className="text-lg font-semibold text-[#10153E]">
                    {card.plus && !card.value.startsWith('+') ? `+${card.value}` : card.value}
                  </p>
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

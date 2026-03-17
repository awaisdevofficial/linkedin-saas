import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, Calendar, TrendingUp, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

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
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const orbit = orbitRef.current;
    const cards = cardsRef.current;

    if (!section || !content || !orbit || !cards) return;

    const ctx = gsap.context(() => {
      // Initial load animation
      const loadTl = gsap.timeline({ delay: 0.2 });

      loadTl
        .from('.hero-eyebrow', { y: -12, opacity: 0, duration: 0.4 })
        .from('.hero-headline span', { 
          y: 40, 
          opacity: 0, 
          duration: 0.6, 
          stagger: 0.08 
        }, '-=0.2')
        .from('.hero-subtext', { y: 18, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('.hero-cta', { y: 14, opacity: 0, duration: 0.4 }, '-=0.2')
        .from(orbit, { 
          scale: 0.92, 
          opacity: 0, 
          rotate: -8, 
          duration: 0.8, 
          ease: 'power2.out' 
        }, '-=0.6')
        .from('.stat-card', { 
          x: 40, 
          y: 20, 
          opacity: 0, 
          duration: 0.5, 
          stagger: 0.08 
        }, '-=0.4');

      // Scroll-driven exit animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // Exit phase (70% - 100%)
      scrollTl
        .fromTo(content, 
          { x: 0, opacity: 1 }, 
          { x: '-40vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo(orbit, 
          { x: 0, opacity: 1 }, 
          { x: '40vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo(cards, 
          { x: 0, opacity: 1 }, 
          { x: '40vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-[#F6F8FC] overflow-hidden"
    >
      {/* Dot pattern background */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />
      
      {/* Glow effect */}
      <div 
        className="absolute right-[20vw] top-1/2 -translate-y-1/2 w-[60vw] h-[60vw] pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(45,90,246,0.12), transparent 65%)'
        }}
      />

      {/* Content */}
      <div 
        ref={contentRef}
        className="absolute left-[7vw] top-1/2 -translate-y-1/2 w-[44vw] max-w-[600px] z-10"
      >
        {/* Eyebrow */}
        <div className="hero-eyebrow inline-flex items-center gap-2 mb-6">
          <span className="mono text-xs uppercase tracking-[0.12em] text-[#2D5AF6] font-medium">
            LinkedIn Automation
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-headline text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-6 leading-[0.95]">
          <span className="block">Your LinkedIn</span>
          <span className="block">content studio,</span>
          <span className="block text-gradient">on autopilot.</span>
        </h1>

        {/* Subtext */}
        <p className="hero-subtext text-lg text-[#6B7098] mb-8 max-w-[400px] leading-relaxed">
          Schedule posts, engage smarter, and grow your presence—with AI that sounds like you.
        </p>

        {/* CTA */}
        <div className="hero-cta flex flex-wrap items-center gap-4">
          <Link to="/auth/signup">
            <Button 
              size="lg" 
              className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full px-8 h-12 text-base font-medium"
            >
              Start free trial
            </Button>
          </Link>
          <button className="flex items-center gap-2 text-[#6B7098] hover:text-[#10153E] transition-colors group">
            <span className="w-10 h-10 rounded-full border border-[#6B7098]/30 flex items-center justify-center group-hover:border-[#2D5AF6] group-hover:bg-[#2D5AF6]/5 transition-all">
              <Play className="w-4 h-4 ml-0.5" />
            </span>
            <span className="text-sm font-medium">Watch a 2-min demo</span>
          </button>
        </div>
      </div>

      {/* Orbit Ring */}
      <div 
        ref={orbitRef}
        className="absolute right-[6vw] top-1/2 -translate-y-1/2 w-[min(52vw,760px)] h-[min(52vw,760px)]"
      >
        {/* Ring */}
        <div className="absolute inset-0 rounded-full border border-[#6B7098]/20" />
        
        {/* Avatars positioned around the ring */}
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

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2D5AF6] to-[#27C696] flex items-center justify-center shadow-xl">
            <span className="text-white font-bold text-2xl">PP</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div ref={cardsRef} className="absolute inset-0 pointer-events-none">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`stat-card absolute bg-white rounded-2xl p-4 card-shadow pointer-events-auto ${card.position}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2D5AF6]/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-[#2D5AF6]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7098] mono uppercase tracking-wide">{card.label}</p>
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

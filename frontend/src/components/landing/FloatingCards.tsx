import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Users, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FloatingCards = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;

    if (!section || !card1 || !card2) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=140%',
          pin: true,
          scrub: 0.6,
        },
      });

      // Entrance (0% - 30%)
      scrollTl
        .fromTo(card1, 
          { x: '-70vw', rotate: -2, opacity: 0 }, 
          { x: 0, rotate: 0, opacity: 1, ease: 'none' }, 
          0
        )
        .fromTo(card2, 
          { x: '70vw', rotate: 2, opacity: 0 }, 
          { x: 0, rotate: 0, opacity: 1, ease: 'none' }, 
          0.08
        )
        .fromTo('.floating-text', 
          { y: 24, opacity: 0 }, 
          { y: 0, opacity: 1, stagger: 0.03, ease: 'none' }, 
          0.15
        );

      // Exit (70% - 100%)
      scrollTl
        .fromTo(card1, 
          { x: 0, opacity: 1 }, 
          { x: '-22vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo(card2, 
          { x: 0, opacity: 1 }, 
          { x: '22vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo('.floating-text', 
          { y: 0, opacity: 1 }, 
          { y: 12, opacity: 0, ease: 'power2.in' }, 
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  const createFeatures = ['AI drafts', 'Carousel builder', 'Hashtag suggestions'];
  const teamFeatures = ['Comments & mentions', 'Approval workflows', 'Shared library'];

  return (
    <section
      ref={sectionRef}
      id="solutions"
      className="relative w-full h-screen bg-[#F6F8FC] overflow-hidden z-30"
    >
      {/* Dot pattern */}
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />

      {/* Card 1 - Create Content (Large, Left) */}
      <div
        ref={card1Ref}
        className="absolute left-[7vw] top-[14vh] w-[54vw] h-[72vh] rounded-[28px] overflow-hidden card-shadow"
      >
        <img
          src="/images/creative-desk.jpg"
          alt="Create content"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#10153E]/90 via-[#10153E]/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="floating-text w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="floating-text mono text-xs uppercase tracking-[0.12em] text-white/70 font-medium mb-2">
            Create
          </p>
          <h3 className="floating-text text-[clamp(28px,2.8vw,40px)] font-bold text-white mb-4">
            Create content that lands.
          </h3>
          <div className="floating-text flex flex-wrap gap-3">
            {createFeatures.map((feature, i) => (
              <span 
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90"
              >
                <Check className="w-3.5 h-3.5 text-[#27C696]" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2 - Teams (Smaller, Right) */}
      <div
        ref={card2Ref}
        className="absolute right-[7vw] top-[20vh] w-[34vw] h-[60vh] rounded-[28px] overflow-hidden card-shadow"
      >
        <img
          src="/images/office-lounge.jpg"
          alt="Built for teams"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#10153E]/90 via-[#10153E]/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="floating-text w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-white" />
          </div>
          <p className="floating-text mono text-xs uppercase tracking-[0.12em] text-white/70 font-medium mb-2">
            Teams
          </p>
          <h3 className="floating-text text-[clamp(22px,2vw,32px)] font-bold text-white mb-4">
            Built for teams.
          </h3>
          <div className="floating-text flex flex-col gap-2">
            {teamFeatures.map((feature, i) => (
              <span 
                key={i}
                className="inline-flex items-center gap-1.5 text-sm text-white/90"
              >
                <Check className="w-3.5 h-3.5 text-[#27C696]" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FloatingCards;

import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Images, Hash, MessageSquare, CheckCircle, FolderOpen } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface FloatingCardsProps {
  headline: string;
  body: string;
  background: string;
  cards: {
    title: string;
    body: string;
    position: 'top-left' | 'top-right' | 'bottom-center';
  }[];
  index: number;
}

const iconMap: Record<string, React.ElementType> = {
  'AI-assisted drafts': Sparkles,
  'Carousel builder': Images,
  'Hashtag + mention suggestions': Hash,
  'Comments & mentions': MessageSquare,
  'Approval workflows': CheckCircle,
  'Shared content library': FolderOpen,
};

export default function FloatingCards({
  headline,
  body,
  background,
  cards,
  index,
}: FloatingCardsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0%-30%)
      // Headline from top
      scrollTl.fromTo(
        headlineRef.current,
        { y: '-40vh', scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      // Cards from different directions
      cards.forEach((card, i) => {
        const cardEl = cardRefs.current[i];
        if (!cardEl) return;

        let fromVars: gsap.TweenVars = {};
        
        if (card.position === 'top-left') {
          fromVars = { x: '-60vw', rotateZ: -10, scale: 0.92, opacity: 0 };
        } else if (card.position === 'top-right') {
          fromVars = { x: '60vw', rotateZ: 10, scale: 0.92, opacity: 0 };
        } else {
          fromVars = { y: '60vh', scale: 0.92, opacity: 0 };
        }

        scrollTl.fromTo(
          cardEl,
          fromVars,
          { x: 0, y: 0, rotateZ: 0, scale: 1, opacity: 1, ease: 'none' },
          i === 2 ? 0.1 : i * 0.05
        );
      });

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        headlineRef.current,
        { y: 0, opacity: 1 },
        { y: '-18vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      cards.forEach((card, i) => {
        const cardEl = cardRefs.current[i];
        if (!cardEl) return;

        let toVars: gsap.TweenVars = {};
        
        if (card.position === 'top-left') {
          toVars = { x: '-22vw', rotateZ: 6, opacity: 0 };
        } else if (card.position === 'top-right') {
          toVars = { x: '22vw', rotateZ: -6, opacity: 0 };
        } else {
          toVars = { y: '22vh', opacity: 0 };
        }

        scrollTl.fromTo(
          cardEl,
          { opacity: 1 },
          { ...toVars, ease: 'power2.in' },
          0.7 + i * 0.02
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [cards, index]);

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'left-[5vw] lg:left-[10vw] top-[30vh] lg:top-[34vh] w-[80vw] sm:w-[50vw] lg:w-[26vw]';
      case 'top-right':
        return 'right-[5vw] lg:right-[10vw] top-[30vh] lg:top-[34vh] w-[80vw] sm:w-[50vw] lg:w-[26vw]';
      case 'bottom-center':
        return 'left-1/2 -translate-x-1/2 top-[55vh] lg:top-[68vh] w-[90vw] sm:w-[70vw] lg:w-[34vw]';
      default:
        return '';
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden"
      style={{ zIndex: (index + 1) * 10 }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${background})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,10,18,0.55)] to-[rgba(7,10,18,0.75)]" />

      {/* Content */}
      <div className="relative z-10 h-full">
        {/* Headline Block */}
        <div
          ref={headlineRef}
          className="absolute left-1/2 -translate-x-1/2 top-[8vh] lg:top-[10vh] text-center max-w-[90vw] lg:max-w-[64vw] px-4"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-3">
            {headline}
          </h2>
          <p className="text-base lg:text-lg text-[#A7B1D8] leading-relaxed">
            {body}
          </p>
        </div>

        {/* Floating Cards */}
        {cards.map((card, i) => {
          const Icon = iconMap[card.title] || Sparkles;
          return (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`absolute ${getPositionClasses(card.position)}`}
            >
              <div className="glass-card p-5 lg:p-6 animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[#4F6DFF]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#4F6DFF]" />
                  </div>
                  <div>
                    <h3 className="text-base lg:text-lg font-semibold text-[#F2F5FF] mb-1">
                      {card.title}
                    </h3>
                    <p className="text-sm text-[#A7B1D8] leading-relaxed">
                      {card.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

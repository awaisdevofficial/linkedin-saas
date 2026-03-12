import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const SecurityFeature = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const imageEl = imageRef.current;
    const content = contentRef.current;
    const iconEl = iconRef.current;

    if (!section || !imageEl || !content || !iconEl) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // Entrance (0% - 30%)
      scrollTl
        .fromTo(imageEl, 
          { x: '60vw', opacity: 0 }, 
          { x: 0, opacity: 1, ease: 'none' }, 
          0
        )
        .fromTo(content, 
          { x: '-40vw', opacity: 0 }, 
          { x: 0, opacity: 1, ease: 'none' }, 
          0.05
        )
        .fromTo(iconEl,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, ease: 'none' },
          0.1
        );

      // Exit (70% - 100%)
      scrollTl
        .fromTo(imageEl, 
          { x: 0, opacity: 1 }, 
          { x: '18vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo(content, 
          { x: 0, opacity: 1 }, 
          { x: '-18vw', opacity: 0, ease: 'power2.in' }, 
          0.7
        )
        .fromTo(iconEl,
          { scale: 1, opacity: 1 },
          { scale: 0.9, opacity: 0, ease: 'power2.in' },
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-[#F6F8FC] overflow-hidden z-40"
    >
      {/* Left Content Panel */}
      <div
        ref={contentRef}
        className="absolute top-0 left-0 w-[48vw] h-full bg-[#F6F8FC] flex items-center"
      >
        <div className="px-[7vw] max-w-[500px]">
          {/* Icon */}
          <div 
            ref={iconRef}
            className="w-14 h-14 rounded-2xl bg-[#4F6DFF]/10 flex items-center justify-center mb-8"
          >
            <Shield className="w-7 h-7 text-[#4F6DFF]" />
          </div>

          {/* Eyebrow */}
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#4F6DFF] font-medium mb-4">
            Security
          </p>

          {/* Headline */}
          <h2 className="text-[clamp(32px,3.2vw,48px)] font-bold text-[#10153E] mb-6 leading-tight">
            Your data stays yours.
          </h2>

          {/* Description */}
          <p className="text-base text-[#6B7098] mb-8 leading-relaxed">
            Encrypted sessions, minimal permissions, and clear controls. We post on your behalf—nothing more.
          </p>

          {/* CTA */}
          <button className="inline-flex items-center gap-2 text-[#4F6DFF] font-medium hover:gap-3 transition-all group">
            <span>Read security notes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Divider Line */}
      <div className="absolute top-[10vh] left-[48vw] w-px h-[80vh] bg-[#6B7098]/20" />

      {/* Right Image Panel */}
      <div
        ref={imageRef}
        className="absolute top-0 left-[48vw] w-[52vw] h-full"
      >
        <img
          src="/images/security-server.jpg"
          alt="Security"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#F6F8FC]/10" />
      </div>
    </section>
  );
};

export default SecurityFeature;

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const MOBILE_BREAKPOINT = 1024;

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

    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);

    const onMatch = () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === section) st.kill();
      });

      if (mq.matches) {
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=130%',
            pin: true,
            scrub: 0.6,
          },
        });

        scrollTl
          .fromTo(imageEl, { x: '60vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0)
          .fromTo(content, { x: '-40vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0.05)
          .fromTo(iconEl, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none' }, 0.1);

        scrollTl
          .fromTo(imageEl, { x: 0, opacity: 1 }, { x: '18vw', opacity: 0, ease: 'power2.in' }, 0.7)
          .fromTo(content, { x: 0, opacity: 1 }, { x: '-18vw', opacity: 0, ease: 'power2.in' }, 0.7)
          .fromTo(iconEl, { scale: 1, opacity: 1 }, { scale: 0.9, opacity: 0, ease: 'power2.in' }, 0.7);
      } else {
        gsap.fromTo(
          [imageEl, content],
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
        gsap.fromTo(
          iconEl,
          { scale: 0.9, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            scrollTrigger: {
              trigger: iconEl,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    };

    onMatch();
    mq.addEventListener('change', onMatch);
    return () => {
      mq.removeEventListener('change', onMatch);
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === section) st.kill();
      });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen lg:h-screen bg-[#F6F8FC] overflow-hidden z-40 flex flex-col lg:block"
    >
      {/* Content - first on mobile (top), left on desktop */}
      <div
        ref={contentRef}
        className="
          flex-1 flex items-center min-h-0 order-2 lg:order-none
          px-4 sm:px-6 py-8 sm:py-12 lg:py-0
          lg:absolute lg:top-0 lg:left-0 lg:h-full lg:w-[48vw] lg:bg-[#F6F8FC]
        "
      >
        <div className="w-full max-w-lg mx-auto lg:mx-0 lg:px-[7vw] lg:max-w-[500px]">
          <div
            ref={iconRef}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mb-6 lg:mb-8"
          >
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-[#6366F1]" />
          </div>
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#6366F1] font-medium mb-3 lg:mb-4">
            Security
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-[clamp(32px,3.2vw,48px)] font-bold text-[#10153E] mb-4 lg:mb-6 leading-tight">
            Your data stays yours.
          </h2>
          <p className="text-base text-[#6B7098] mb-6 lg:mb-8 leading-relaxed">
            Encrypted sessions, minimal permissions, and clear controls. We post on your behalf—nothing more.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-[#6366F1] font-medium hover:gap-3 transition-all group min-h-[44px] touch-manipulation"
          >
            <span>Read security notes</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="hidden lg:block absolute top-[10vh] left-[48vw] w-px h-[80vh] bg-[#6B7098]/20" />

      {/* Image - second on mobile (below content), right on desktop */}
      <div
        ref={imageRef}
        className="
          w-full aspect-[4/3] sm:aspect-video flex-shrink-0 overflow-hidden order-1 lg:order-none
          lg:absolute lg:top-0 lg:left-[48vw] lg:w-[52vw] lg:h-full lg:aspect-auto
        "
      >
        <img
          src="/images/security-server.jpg"
          alt="Security"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#F6F8FC]/10" />
      </div>
    </section>
  );
};

export default SecurityFeature;

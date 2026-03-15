import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const FinalCTA = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;

    if (!section || !content) return;

    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

    const ctx = gsap.context(() => {
      if (!isDesktop()) {
        gsap.fromTo(
          ['.cta-headline', '.cta-subtext', '.cta-buttons'],
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
        return;
      }

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 0.6,
        },
      });

      scrollTl
        .fromTo('.cta-headline', { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' }, 0)
        .fromTo('.cta-subtext', { y: 28, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' }, 0.08)
        .fromTo('.cta-buttons', { y: 18, opacity: 0 }, { y: 0, opacity: 1, ease: 'none' }, 0.15)
        .fromTo(content, { y: 0, opacity: 1 }, { y: '-18vh', opacity: 0, ease: 'power2.in' }, 0.7);
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen lg:h-screen bg-white overflow-hidden z-[60] flex items-center justify-center py-20 lg:py-0"
    >
      <div
        ref={contentRef}
        className="relative w-full flex items-center justify-center px-4 sm:px-6"
      >
        <div className="text-center max-w-[720px] w-full">
          <h2 className="cta-headline text-3xl sm:text-4xl md:text-5xl lg:text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-4 sm:mb-6 leading-tight">
            Ready to own your
            <br />
            LinkedIn presence?
          </h2>
          <p className="cta-subtext text-base sm:text-lg text-[#6B7098] mb-8 sm:mb-10">
            Start free. No credit card required.
          </p>
          <div className="cta-buttons flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link to="/auth/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="cta-buttons w-full sm:w-auto bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-full px-8 min-h-[48px] h-12 text-base font-medium touch-manipulation"
              >
                Start free trial
              </Button>
            </Link>
            <button
              type="button"
              className="text-[#6B7098] hover:text-[#10153E] transition-colors text-sm font-medium min-h-[48px] flex items-center justify-center touch-manipulation"
            >
              Or book a 15-min call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

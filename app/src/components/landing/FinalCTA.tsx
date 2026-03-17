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

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 0.6,
        },
      });

      // Entrance (0% - 30%)
      scrollTl
        .fromTo('.cta-headline', 
          { y: 40, opacity: 0 }, 
          { y: 0, opacity: 1, ease: 'none' }, 
          0
        )
        .fromTo('.cta-subtext', 
          { y: 28, opacity: 0 }, 
          { y: 0, opacity: 1, ease: 'none' }, 
          0.08
        )
        .fromTo('.cta-buttons', 
          { y: 18, opacity: 0 }, 
          { y: 0, opacity: 1, ease: 'none' }, 
          0.15
        );

      // Exit (70% - 100%)
      scrollTl.fromTo(content,
        { y: 0, opacity: 1 },
        { y: '-18vh', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-white overflow-hidden z-[60]"
    >
      <div 
        ref={contentRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="text-center max-w-[720px] px-6">
          <h2 className="cta-headline text-[clamp(36px,4.5vw,64px)] font-bold text-[#10153E] mb-6 leading-tight">
            Ready to own your<br />LinkedIn presence?
          </h2>
          <p className="cta-subtext text-lg text-[#6B7098] mb-10">
            Start free. No credit card required.
          </p>
          <div className="cta-buttons flex flex-wrap items-center justify-center gap-4">
            <Link to="/auth/signup">
              <Button 
                size="lg" 
                className="bg-[#2D5AF6] hover:bg-[#1E4AD6] text-white rounded-full px-8 h-12 text-base font-medium"
              >
                Start free trial
              </Button>
            </Link>
            <button className="text-[#6B7098] hover:text-[#10153E] transition-colors text-sm font-medium">
              Or book a 15-min call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;

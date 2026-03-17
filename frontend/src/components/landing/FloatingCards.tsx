import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Users, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const MOBILE_BREAKPOINT = 1024;

const FloatingCards = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const card1 = card1Ref.current;
    const card2 = card2Ref.current;

    if (!section || !card1 || !card2) return;

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
            end: '+=140%',
            pin: true,
            scrub: 0.6,
          },
        });

        scrollTl
          .fromTo(card1, { x: '-70vw', rotate: -2, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, ease: 'none' }, 0)
          .fromTo(card2, { x: '70vw', rotate: 2, opacity: 0 }, { x: 0, rotate: 0, opacity: 1, ease: 'none' }, 0.08)
          .fromTo('.floating-text', { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.03, ease: 'none' }, 0.15);

        scrollTl
          .fromTo(card1, { x: 0, opacity: 1 }, { x: '-22vw', opacity: 0, ease: 'power2.in' }, 0.7)
          .fromTo(card2, { x: 0, opacity: 1 }, { x: '22vw', opacity: 0, ease: 'power2.in' }, 0.7)
          .fromTo('.floating-text', { y: 0, opacity: 1 }, { y: 12, opacity: 0, ease: 'power2.in' }, 0.7);
      } else {
        gsap.fromTo(
          [card1, card2],
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
        const texts = section.querySelectorAll('.floating-text');
        if (texts.length) {
          gsap.fromTo(
            texts,
            { y: 16, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.4,
              delay: 0.2,
              stagger: 0.05,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        }
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

  const createFeatures = ['AI drafts', 'Carousel builder', 'Hashtag suggestions'];
  const teamFeatures = ['Comments & mentions', 'Approval workflows', 'Shared library'];

  return (
    <section
      ref={sectionRef}
      id="solutions"
      className="relative w-full min-h-screen lg:h-screen bg-[#F6F8FC] overflow-hidden z-30 py-16 lg:py-0"
    >
      <div className="absolute inset-0 bg-dot-pattern opacity-50" />

      {/* Wrapper: column on mobile, full area on desktop */}
      <div className="h-full lg:absolute lg:inset-0 flex flex-col lg:block max-w-lg lg:max-w-none mx-auto px-4 sm:px-6 lg:px-0 lg:mx-0">
        {/* Card 1 - Create */}
        <div
          ref={card1Ref}
          className="
            w-full flex-shrink-0 mb-6 lg:mb-0
            aspect-[4/3] sm:aspect-[5/4] lg:aspect-auto
            rounded-2xl sm:rounded-[28px] overflow-hidden card-shadow touch-manipulation
            lg:absolute lg:left-[7vw] lg:top-[14vh] lg:w-[54vw] lg:h-[72vh]
          "
        >
          <img
            src="/images/creative-desk.jpg"
            alt="Create content"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10153E]/90 via-[#10153E]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 lg:p-8">
            <div className="floating-text w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 lg:mb-4">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <p className="floating-text mono text-xs uppercase tracking-[0.12em] text-white/70 font-medium mb-1 lg:mb-2">
              Create
            </p>
            <h3 className="floating-text text-xl sm:text-2xl lg:text-[clamp(28px,2.8vw,40px)] font-bold text-white mb-3 lg:mb-4">
              Create content that lands.
            </h3>
            <div className="floating-text flex flex-wrap gap-2 lg:gap-3">
              {createFeatures.map((feature, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-xs sm:text-sm text-white/90"
                >
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#27C696] shrink-0" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2 - Teams */}
        <div
          ref={card2Ref}
          className="
            w-full flex-shrink-0 lg:flex-shrink-0
            aspect-[4/3] sm:aspect-[5/4] lg:aspect-auto
            rounded-2xl sm:rounded-[28px] overflow-hidden card-shadow touch-manipulation
            lg:absolute lg:right-[7vw] lg:top-[20vh] lg:w-[34vw] lg:h-[60vh]
          "
        >
          <img
            src="/images/office-lounge.jpg"
            alt="Built for teams"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10153E]/90 via-[#10153E]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="floating-text w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 lg:mb-4">
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="floating-text mono text-xs uppercase tracking-[0.12em] text-white/70 font-medium mb-1 lg:mb-2">
              Teams
            </p>
            <h3 className="floating-text text-lg sm:text-xl lg:text-[clamp(22px,2vw,32px)] font-bold text-white mb-3 lg:mb-4">
              Built for teams.
            </h3>
            <div className="floating-text flex flex-col gap-1.5 lg:gap-2">
              {teamFeatures.map((feature, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-sm text-white/90"
                >
                  <Check className="w-3.5 h-3.5 text-[#27C696] shrink-0" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FloatingCards;

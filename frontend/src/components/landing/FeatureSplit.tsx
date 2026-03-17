import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, BarChart3, MessageSquare, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const MOBILE_BREAKPOINT = 1024;

interface FeatureSplitProps {
  eyebrow: string;
  headline: string;
  description: string;
  cta: string;
  image: string;
  icon: React.ElementType;
  layout: 'left' | 'right';
  id?: string;
}

const FeatureSplit = ({
  eyebrow,
  headline,
  description,
  cta,
  image,
  icon: Icon,
  layout,
  id,
}: FeatureSplitProps) => {
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
        // Desktop: pin + scrub
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=130%',
            pin: true,
            scrub: 0.6,
          },
        });

        if (layout === 'left') {
          scrollTl
            .fromTo(imageEl, { x: '-60vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0)
            .fromTo(content, { x: '40vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0.05);
        } else {
          scrollTl
            .fromTo(imageEl, { x: '60vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0)
            .fromTo(content, { x: '-40vw', opacity: 0 }, { x: 0, opacity: 1, ease: 'none' }, 0.05);
        }

        scrollTl.fromTo(
          iconEl,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, ease: 'none' },
          0.1
        );

        if (layout === 'left') {
          scrollTl
            .fromTo(imageEl, { x: 0, opacity: 1 }, { x: '-18vw', opacity: 0, ease: 'power2.in' }, 0.7)
            .fromTo(content, { x: 0, opacity: 1 }, { x: '18vw', opacity: 0, ease: 'power2.in' }, 0.7);
        } else {
          scrollTl
            .fromTo(imageEl, { x: 0, opacity: 1 }, { x: '18vw', opacity: 0, ease: 'power2.in' }, 0.7)
            .fromTo(content, { x: 0, opacity: 1 }, { x: '-18vw', opacity: 0, ease: 'power2.in' }, 0.7);
        }

        scrollTl.fromTo(
          iconEl,
          { scale: 1, opacity: 1 },
          { scale: 0.9, opacity: 0, ease: 'power2.in' },
          0.7
        );
      } else {
        // Mobile: one-time fade-in
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
  }, [layout]);

  const isLeft = layout === 'left';

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative w-full min-h-screen lg:h-screen bg-[#F6F8FC] overflow-hidden z-20 flex flex-col lg:block"
    >
      {/* Single responsive layout: stacked on mobile, side-by-side on desktop */}
      <div
        ref={imageRef}
        className={`
          w-full aspect-[4/3] sm:aspect-video flex-shrink-0 overflow-hidden
          lg:absolute lg:top-0 lg:left-0 lg:h-full lg:aspect-auto lg:w-[52vw]
          ${isLeft ? '' : 'lg:left-[48vw]'}
        `}
      >
        <img
          src={image}
          alt={headline}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#F6F8FC]/10 lg:block" />
      </div>

      {/* Divider - desktop only */}
      <div
        className={`hidden lg:block absolute top-[10vh] ${isLeft ? 'left-[52vw]' : 'left-[48vw]'} w-px h-[80vh] bg-[#6B7098]/20`}
      />

      <div
        ref={contentRef}
        className={`
          flex-1 flex items-center min-h-0
          px-4 sm:px-6 py-8 sm:py-12 lg:py-0
          lg:absolute lg:top-0 lg:left-0 lg:h-full lg:w-[48vw] lg:bg-[#F6F8FC]
          ${isLeft ? 'lg:left-[52vw]' : 'lg:left-0'}
        `}
      >
        <div
          className={`
            w-full max-w-lg mx-auto lg:mx-0
            lg:px-[7vw] lg:max-w-[500px]
            ${!isLeft ? 'lg:ml-auto lg:mr-[7vw]' : ''}
          `}
        >
          <div
            ref={iconRef}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mb-6 lg:mb-8"
          >
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#6366F1]" />
          </div>
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#6366F1] font-medium mb-3 lg:mb-4">
            {eyebrow}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-[clamp(32px,3.2vw,48px)] font-bold text-[#10153E] mb-4 lg:mb-6 leading-tight">
            {headline}
          </h2>
          <p className="text-base text-[#6B7098] mb-6 lg:mb-8 leading-relaxed">
            {description}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-[#6366F1] font-medium hover:gap-3 transition-all group min-h-[44px] touch-manipulation"
          >
            <span>{cta}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export const SchedulingFeature = () => (
  <FeatureSplit
    id="features"
    eyebrow="Scheduling"
    headline="Plan your week in minutes."
    description="Drag, drop, and schedule your LinkedIn content across profiles. Visual calendar, timezone-aware, and buffer times built in."
    cta="Explore scheduling"
    image="/images/scheduling-workspace.jpg"
    icon={Calendar}
    layout="left"
  />
);

export const AnalyticsFeature = () => (
  <FeatureSplit
    eyebrow="Analytics"
    headline="Know what's working."
    description="Track reach, engagement, and follower growth by post type and topic. Export reports or share dashboards with your team."
    cta="See analytics"
    image="/images/analytics-desk.jpg"
    icon={BarChart3}
    layout="right"
  />
);

export const EngagementFeature = () => (
  <FeatureSplit
    eyebrow="Engagement"
    headline="Stay responsive at scale."
    description="Auto-reply to comments, manage DMs, and keep conversations alive—without losing the human touch."
    cta="Explore engagement"
    image="/images/team-meeting.jpg"
    icon={MessageSquare}
    layout="left"
  />
);

export default FeatureSplit;

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, BarChart3, MessageSquare, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

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
  id 
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
      if (layout === 'left') {
        scrollTl
          .fromTo(imageEl, 
            { x: '-60vw', opacity: 0 }, 
            { x: 0, opacity: 1, ease: 'none' }, 
            0
          )
          .fromTo(content, 
            { x: '40vw', opacity: 0 }, 
            { x: 0, opacity: 1, ease: 'none' }, 
            0.05
          );
      } else {
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
          );
      }

      scrollTl.fromTo(iconEl,
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'none' },
        0.1
      );

      // Exit (70% - 100%)
      if (layout === 'left') {
        scrollTl
          .fromTo(imageEl, 
            { x: 0, opacity: 1 }, 
            { x: '-18vw', opacity: 0, ease: 'power2.in' }, 
            0.7
          )
          .fromTo(content, 
            { x: 0, opacity: 1 }, 
            { x: '18vw', opacity: 0, ease: 'power2.in' }, 
            0.7
          );
      } else {
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
          );
      }

      scrollTl.fromTo(iconEl,
        { scale: 1, opacity: 1 },
        { scale: 0.9, opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, [layout]);

  const isLeft = layout === 'left';

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative w-full h-screen bg-[#F6F8FC] overflow-hidden z-20"
    >
      {/* Image Panel */}
      <div
        ref={imageRef}
        className={`absolute top-0 ${isLeft ? 'left-0' : 'left-[48vw]'} w-[52vw] h-full`}
      >
        <img
          src={image}
          alt={headline}
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay for text readability if needed */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#F6F8FC]/10" />
      </div>

      {/* Divider Line */}
      <div 
        className={`absolute top-[10vh] ${isLeft ? 'left-[52vw]' : 'left-[48vw]'} w-px h-[80vh] bg-[#6B7098]/20`}
      />

      {/* Content Panel */}
      <div
        ref={contentRef}
        className={`absolute top-0 ${isLeft ? 'left-[52vw]' : 'left-0'} w-[48vw] h-full bg-[#F6F8FC] flex items-center`}
      >
        <div className={`px-[7vw] max-w-[500px] ${isLeft ? '' : 'ml-auto mr-[7vw]'}`}>
          {/* Icon */}
          <div 
            ref={iconRef}
            className="w-14 h-14 rounded-2xl bg-[#4F6DFF]/10 flex items-center justify-center mb-8"
          >
            <Icon className="w-7 h-7 text-[#4F6DFF]" />
          </div>

          {/* Eyebrow */}
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#4F6DFF] font-medium mb-4">
            {eyebrow}
          </p>

          {/* Headline */}
          <h2 className="text-[clamp(32px,3.2vw,48px)] font-bold text-[#10153E] mb-6 leading-tight">
            {headline}
          </h2>

          {/* Description */}
          <p className="text-base text-[#6B7098] mb-8 leading-relaxed">
            {description}
          </p>

          {/* CTA */}
          <button className="inline-flex items-center gap-2 text-[#4F6DFF] font-medium hover:gap-3 transition-all group">
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

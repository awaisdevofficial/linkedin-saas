import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '../components/Navigation';
import HeroSection from '../sections/HeroSection';
import FeatureSplit from '../sections/FeatureSplit';
import FloatingCards from '../sections/FloatingCards';
import Testimonials from '../sections/Testimonials';
import Pricing from '../sections/Pricing';
import FAQ from '../sections/FAQ';
import Footer from '../sections/Footer';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    id: 'scheduling',
    label: 'SCHEDULING',
    headline: 'Plan your week in minutes.',
    body: 'Drag, drop, and schedule posts across profiles. PostPilot publishes at the best times—automatically.',
    cta: 'See how scheduling works',
    image: '/images/scheduling-workspace.jpg',
    reverse: false,
  },
  {
    id: 'analytics',
    label: 'ANALYTICS',
    headline: 'Know what\'s working.',
    body: 'Track reach, engagement, and follower growth—then double down on the content that converts.',
    cta: 'Explore analytics',
    image: '/images/analytics-desk.jpg',
    reverse: true,
  },
  {
    id: 'engagement',
    label: 'ENGAGEMENT',
    headline: 'Stay responsive at scale.',
    body: 'Auto-reply to comments, manage DMs, and nurture leads—without losing the human touch.',
    cta: 'Learn about engagement',
    image: '/images/team-meeting.jpg',
    reverse: false,
  },
];

const floatingContent = {
  headline: 'Create content that lands.',
  body: 'From hooks to carousels, PostPilot helps you build posts that feel personal—at scale.',
  background: '/images/creative-desk.jpg',
  cards: [
    {
      title: 'AI-assisted drafts',
      body: 'Generate captions and variants in your tone.',
      position: 'top-left' as const,
    },
    {
      title: 'Carousel builder',
      body: 'Turn a brief into a swipeable PDF deck.',
      position: 'top-right' as const,
    },
    {
      title: 'Hashtag + mention suggestions',
      body: 'Reach the right people without the guesswork.',
      position: 'bottom-center' as const,
    },
  ],
};

const floatingCollaboration = {
  headline: 'Built for teams.',
  body: 'Draft, review, and approve posts together—without endless threads.',
  background: '/images/office-lounge.jpg',
  cards: [
    {
      title: 'Comments & mentions',
      body: 'Tag teammates for fast feedback.',
      position: 'top-left' as const,
    },
    {
      title: 'Approval workflows',
      body: 'Require sign-off before anything goes live.',
      position: 'top-right' as const,
    },
    {
      title: 'Shared content library',
      body: 'Save snippets, images, and templates for reuse.',
      position: 'bottom-center' as const,
    },
  ],
};

const securityFeature = {
  id: 'security',
  label: 'SECURITY',
  headline: 'Your data stays yours.',
  body: 'Encrypted at rest, minimal permissions, and full control over what PostPilot can access.',
  cta: 'Read our security overview',
  image: '/images/security-server.jpg',
  reverse: true,
  glow: true,
};

const integrationsFeature = {
  id: 'integrations',
  label: 'INTEGRATIONS',
  headline: 'Plays well with your stack.',
  body: 'Connect your favorite tools—CRM, docs, storage, and more—so your workflow stays seamless.',
  cta: 'Browse integrations',
  image: '/images/tech-office.jpg',
  reverse: false,
  icons: true,
};

export default function LandingPage() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global snap for pinned sections
    const setupGlobalSnap = () => {
      const pinned = ScrollTrigger.getAll()
        .filter(st => st.vars.pin)
        .sort((a, b) => a.start - b.start);
      
      const maxScroll = ScrollTrigger.maxScroll(window);
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map(st => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.5) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            const inPinned = pinnedRanges.some(
              r => value >= r.start - 0.08 && value <= r.end + 0.08
            );
            if (!inPinned) return value;

            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    };

    // Delay to allow all ScrollTriggers to initialize
    const timer = setTimeout(setupGlobalSnap, 500);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={mainRef} className="landing-root relative bg-[#070A12]">
      <Navigation />
      
      {/* Section 1: Hero */}
      <HeroSection />
      
      {/* Sections 2-4: Feature Splits */}
      {features.map((feature, index) => (
        <FeatureSplit key={feature.id} {...feature} index={index + 1} />
      ))}
      
      {/* Section 5: Floating Cards - Content */}
      <FloatingCards {...floatingContent} index={4} />
      
      {/* Section 6: Floating Cards - Collaboration */}
      <FloatingCards {...floatingCollaboration} index={5} />
      
      {/* Section 7: Security */}
      <FeatureSplit {...securityFeature} index={6} />
      
      {/* Section 8: Integrations */}
      <FeatureSplit {...integrationsFeature} index={7} />
      
      {/* Section 9: Testimonials */}
      <Testimonials />
      
      {/* Section 10: Pricing */}
      <Pricing />
      
      {/* Section 11: FAQ */}
      <FAQ />
      
      {/* Section 12: Footer */}
      <Footer />
    </div>
  );
}

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navigation from '@/components/landing/Navigation';
import HeroSection from '@/components/landing/HeroSection';
import { SchedulingFeature, AnalyticsFeature, EngagementFeature } from '@/components/landing/FeatureSplit';
import FloatingCards from '@/components/landing/FloatingCards';
import SecurityFeature from '@/components/landing/SecurityFeature';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/landing/Footer';
import DashboardPreview from '@/components/landing/DashboardPreview';

gsap.registerPlugin(ScrollTrigger);

const LANDING_MOBILE_BREAKPOINT = 1024;

const LandingPage = () => {
  useEffect(() => {
    const isDesktop = () => window.matchMedia(`(min-width: ${LANDING_MOBILE_BREAKPOINT}px)`).matches;

    // Only enable snap on desktop; on mobile it causes jank and poor UX
    const setupSnap = () => {
      if (!isDesktop()) return;
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
              r => value >= r.start - 0.02 && value <= r.end + 0.02
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

    const timer = setTimeout(setupSnap, 100);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <main className="relative w-full overflow-x-hidden">
      <Navigation />
      
      {/* Pinned Sections with z-index stacking */}
      <div className="relative z-10">
        <HeroSection />
      </div>
      <div className="relative z-20">
        <SchedulingFeature />
      </div>
      <div className="relative z-30">
        <AnalyticsFeature />
      </div>
      <div className="relative z-40">
        <EngagementFeature />
      </div>
      <div className="relative z-50">
        <FloatingCards />
      </div>
      <div className="relative z-[55]">
        <SecurityFeature />
      </div>
      
      {/* Flowing Sections */}
      <Testimonials />
      <FAQ />
      
      {/* Final Pinned CTA */}
      <div className="relative z-[60]">
        <FinalCTA />
      </div>
      
      {/* Footer and Dashboard Preview */}
      <Footer />
      <DashboardPreview />
    </main>
  );
};

export default LandingPage;

import { useEffect, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Play, Calendar, BarChart3, MessageCircle, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Auto-play entrance animation on load
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Background fade in
      tl.fromTo(
        sectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 }
      );

      // Headline animation
      tl.fromTo(
        headlineRef.current,
        { y: 24, scale: 0.98, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.7 },
        '-=0.3'
      );

      // Content animation
      tl.fromTo(
        contentRef.current?.children || [],
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 },
        '-=0.4'
      );

      // Right cluster animation
      tl.fromTo(
        clusterRef.current,
        { x: '10vw', rotateZ: 6, scale: 0.92, opacity: 0 },
        { x: 0, rotateZ: 0, scale: 1, opacity: 1, duration: 0.9 },
        '-=0.6'
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven exit animation
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset elements when scrolling back to top
            gsap.set([headlineRef.current, contentRef.current], {
              x: 0,
              opacity: 1,
            });
            gsap.set(clusterRef.current, {
              x: 0,
              rotateZ: 0,
              scale: 1,
              opacity: 1,
            });
          },
        },
      });

      // ENTRANCE (0%-30%): Hold (entrance handled by load animation)
      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        headlineRef.current,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        contentRef.current,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        clusterRef.current,
        { x: 0, rotateZ: 0, scale: 1, opacity: 1 },
        { x: '18vw', rotateZ: -8, scale: 0.92, opacity: 0, ease: 'power2.in' },
        0.7
      );

      // Background scale
      scrollTl.fromTo(
        '.hero-bg',
        { scale: 1 },
        { scale: 1.06, ease: 'none' },
        0.7
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden z-10"
    >
      {/* Background Image */}
      <div
        className="hero-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/hero-orbit.jpg)' }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,10,18,0.35)] to-[rgba(7,10,18,0.65)]" />

      {/* Noise Overlay */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <div ref={headlineRef}>
                <span className="mono text-xs font-medium uppercase tracking-[0.12em] text-[#4F6DFF] mb-4 block">
                  LinkedIn Automation
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-[#F2F5FF] leading-[1.05] tracking-[-0.02em]">
                  Your LinkedIn content studio, on autopilot.
                </h1>
              </div>

              <div ref={contentRef} className="mt-6 lg:mt-8 space-y-6">
                <p className="text-base lg:text-lg text-[#A7B1D8] leading-relaxed">
                  Schedule posts, engage smarter, and grow your presence—with AI that sounds like you.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/auth/signup">
                    <Button
                      size="lg"
                      className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl px-6 py-3 text-base font-medium shadow-lg shadow-[#4F6DFF]/25 transition-all hover:shadow-xl hover:shadow-[#4F6DFF]/30"
                    >
                      Start free trial
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl px-6 py-3 text-base font-medium"
                  >
                    <Play className="mr-2 w-4 h-4" />
                    Watch a 2-min demo
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Visual Cluster */}
            <div
              ref={clusterRef}
              className="hidden lg:flex justify-center items-center relative"
            >
              {/* Avatar Ring */}
              <div className="relative w-64 h-64 xl:w-80 xl:h-80">
                {/* Rotating ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#4F6DFF]/30 animate-spin-slow" />
                
                {/* Avatar image */}
                <div className="absolute inset-4 rounded-full overflow-hidden shadow-2xl shadow-black/50">
                  <img
                    src="/images/avatar-ring.jpg"
                    alt="Team"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Floating UI Cards */}
                <div ref={cardsRef} className="absolute inset-0">
                  {/* Card 1 - Top */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 glass-card p-3 animate-float">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#4F6DFF]/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#4F6DFF]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A7B1D8]">Scheduled</p>
                        <p className="text-sm font-semibold text-[#F2F5FF]">24 posts</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 - Right */}
                  <div className="absolute top-1/2 -right-8 -translate-y-1/2 glass-card p-3 animate-float-delayed">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#27C696]/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-[#27C696]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A7B1D8]">Engagement</p>
                        <p className="text-sm font-semibold text-[#F2F5FF]">+47%</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 - Bottom */}
                  <div className="absolute -bottom-4 left-1/4 glass-card p-3 animate-float">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFD166]/20 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-[#FFD166]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A7B1D8]">Comments</p>
                        <p className="text-sm font-semibold text-[#F2F5FF]">128 today</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4 - Left */}
                  <div className="absolute top-1/3 -left-8 glass-card p-3 animate-float-delayed">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B6B]/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#FF6B6B]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#A7B1D8]">New followers</p>
                        <p className="text-sm font-semibold text-[#F2F5FF]">+892</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

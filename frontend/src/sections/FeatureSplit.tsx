import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Shield, Zap, FileText, Database, Globe, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';

gsap.registerPlugin(ScrollTrigger);

interface FeatureSplitProps {
  id: string;
  label: string;
  headline: string;
  body: string;
  cta: string;
  image: string;
  reverse?: boolean;
  glow?: boolean;
  icons?: boolean;
  index: number;
}

const integrationIcons = [
  { icon: FileText, color: '#4F6DFF', name: 'Docs' },
  { icon: Database, color: '#27C696', name: 'CRM' },
  { icon: Globe, color: '#FFD166', name: 'Web' },
  { icon: Lock, color: '#FF6B6B', name: 'Auth' },
  { icon: Zap, color: '#4F6DFF', name: 'API' },
  { icon: Shield, color: '#27C696', name: 'Sec' },
];

export default function FeatureSplit({
  label,
  headline,
  body,
  cta,
  image,
  reverse = false,
  glow = false,
  icons = false,
  index,
}: FeatureSplitProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0%-30%)
      scrollTl.fromTo(
        panelRef.current,
        { x: reverse ? '60vw' : '-60vw', rotateY: reverse ? -18 : 18, scale: 0.92, opacity: 0 },
        { x: 0, rotateY: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      scrollTl.fromTo(
        imageRef.current,
        { x: reverse ? '-60vw' : '60vw', rotateY: reverse ? 14 : -14, scale: 0.92, opacity: 0 },
        { x: 0, rotateY: 0, scale: 1, opacity: 1, ease: 'none' },
        0.05
      );

      if (glow && glowRef.current) {
        scrollTl.fromTo(
          glowRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 0.35, ease: 'none' },
          0.1
        );
      }

      // SETTLE (30%-70%): Hold

      // EXIT (70%-100%)
      scrollTl.fromTo(
        panelRef.current,
        { x: 0, opacity: 1 },
        { x: reverse ? '28vw' : '-28vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        imageRef.current,
        { x: 0, rotateY: 0, opacity: 1 },
        { x: reverse ? '-28vw' : '28vw', rotateY: reverse ? -10 : 10, opacity: 0, ease: 'power2.in' },
        0.7
      );

      if (glow && glowRef.current) {
        scrollTl.fromTo(
          glowRef.current,
          { opacity: 0.35 },
          { opacity: 0, ease: 'power2.in' },
          0.85
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reverse, glow, index]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden"
      style={{ zIndex: (index + 1) * 10 }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,10,18,0.5)] to-[rgba(7,10,18,0.75)]" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
              reverse ? 'lg:flex-row-reverse' : ''
            }`}
          >
            {/* Glass Panel */}
            <div
              ref={panelRef}
              className={`${reverse ? 'lg:order-2' : 'lg:order-1'}`}
            >
              <div className="glass-card p-6 sm:p-8 lg:p-10 max-w-xl">
                <span className="mono text-xs font-medium uppercase tracking-[0.12em] text-[#4F6DFF] mb-4 block">
                  {label}
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-4">
                  {headline}
                </h2>
                <p className="text-base lg:text-lg text-[#A7B1D8] leading-relaxed mb-6">
                  {body}
                </p>
                <Button
                  variant="outline"
                  className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl px-5 py-2.5 text-sm font-medium"
                >
                  {cta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Image Card */}
            <div
              ref={imageRef}
              className={`relative ${reverse ? 'lg:order-1' : 'lg:order-2'}`}
            >
              {/* Glow effect for security */}
              {glow && (
                <div
                  ref={glowRef}
                  className="absolute inset-0 bg-[#4F6DFF] rounded-[34px] blur-3xl opacity-0"
                />
              )}

              <div className="relative glass-card overflow-hidden aspect-[4/3]">
                <img
                  src={image}
                  alt={headline}
                  className="w-full h-full object-cover"
                />

                {/* Integration icons overlay */}
                {icons && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="flex flex-wrap justify-center gap-4 p-6">
                      {integrationIcons.map((item, i) => (
                        <div
                          key={i}
                          className="w-14 h-14 rounded-2xl bg-[rgba(16,22,46,0.85)] backdrop-blur-xl border border-white/10 flex items-center justify-center"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        >
                          <item.icon
                            className="w-6 h-6"
                            style={{ color: item.color }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

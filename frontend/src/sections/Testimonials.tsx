import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: 'I went from 3 hours a week to 20 minutes. PostPilot completely transformed how I manage my LinkedIn presence.',
    author: 'A. R.',
    role: 'Marketing Lead',
    company: 'TechScale',
  },
  {
    quote: 'Scheduling + analytics in one place is a game changer. Finally, I can see what actually works.',
    author: 'S. M.',
    role: 'Founder',
    company: 'GrowthLabs',
  },
  {
    quote: 'Our team finally stopped missing posting windows. The approval workflow is a lifesaver.',
    author: 'J. L.',
    role: 'Content Manager',
    company: 'MediaFirst',
  },
  {
    quote: 'The AI drafts feel surprisingly on-brand. It\'s like having a copywriter who knows my voice.',
    author: 'K. T.',
    role: 'Creator',
    company: 'Independent',
  },
  {
    quote: 'Approval workflows saved us from last-minute typos. Our clients love the polished output.',
    author: 'D. P.',
    role: 'Agency Director',
    company: 'SocialPro',
  },
  {
    quote: 'Support is fast, and the product keeps improving. Best investment for our social strategy.',
    author: 'M. N.',
    role: 'Growth Lead',
    company: 'StartupXYZ',
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Cards animation
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 40, scale: 0.98, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.5,
            delay: i * 0.08,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="relative py-20 lg:py-32 bg-[#070A12]"
      style={{ zIndex: 100 }}
    >
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,109,255,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-4">
            Loved by creators, marketers, and founders.
          </h2>
          <p className="text-base lg:text-lg text-[#A7B1D8] max-w-2xl mx-auto">
            Here&apos;s what early teams say about PostPilot.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="glass-card p-6 hover:border-[#4F6DFF]/30 transition-colors"
            >
              <Quote className="w-8 h-8 text-[#4F6DFF]/40 mb-4" />
              <p className="text-[#F2F5FF] leading-relaxed mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F2F5FF]">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-[#A7B1D8]">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

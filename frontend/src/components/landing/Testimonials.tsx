import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: "The calendar alone saved us 6 hours a week.",
    name: "A.R.",
    role: "Marketing Lead",
    avatar: "/images/avatar-1.jpg"
  },
  {
    quote: "Our engagement doubled without more work.",
    name: "S.M.",
    role: "Founder",
    avatar: "/images/avatar-3.jpg"
  },
  {
    quote: "Finally, a tool that keeps our brand voice consistent.",
    name: "J.L.",
    role: "Content Manager",
    avatar: "/images/avatar-2.jpg"
  },
  {
    quote: "Scheduling carousels used to be a pain. Not anymore.",
    name: "K.T.",
    role: "Creator",
    avatar: "/images/avatar-4.jpg"
  },
  {
    quote: "Client approvals are now a 10-minute task.",
    name: "D.P.",
    role: "Agency Director",
    avatar: "/images/avatar-5.jpg"
  },
  {
    quote: "It feels like having an extra team member.",
    name: "M.N.",
    role: "Growth Lead",
    avatar: "/images/avatar-6.jpg"
  }
];

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current;

    if (!section || !header || !cards) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(header,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: header,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Cards animation
      const cardElements = cards.querySelectorAll('.testimonial-card');
      cardElements.forEach((card, i) => {
        gsap.fromTo(card,
          { y: 40, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            delay: i * 0.08,
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            }
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#F6F8FC] py-12 sm:py-16 lg:py-24 z-50 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-10 sm:mb-16">
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#4F6DFF] font-medium mb-3 sm:mb-4">
            Testimonials
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[clamp(32px,3.6vw,52px)] font-bold text-[#10153E] max-w-[600px] mx-auto leading-tight">
            Loved by founders, marketers, and creators.
          </h2>
        </div>

        {/* Cards Grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="testimonial-card bg-white rounded-[18px] sm:rounded-[22px] p-5 sm:p-7 card-shadow hover:shadow-lg transition-shadow touch-manipulation"
            >
              <Quote className="w-8 h-8 text-[#4F6DFF]/20 mb-4" />
              <p className="text-lg text-[#10153E] font-medium mb-6 leading-snug">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-[#10153E]">{testimonial.name}</p>
                  <p className="text-xs text-[#6B7098]">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

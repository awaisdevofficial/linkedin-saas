import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    description: 'Perfect for getting started',
    features: [
      '1 LinkedIn profile',
      '10 scheduled posts/mo',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get started free',
    href: '/auth/signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For serious creators',
    features: [
      '3 profiles',
      'Unlimited scheduling',
      'Advanced analytics',
      'AI drafts',
      'Priority support',
    ],
    cta: 'Start Pro trial',
    href: '/auth/signup',
    popular: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/mo',
    description: 'For agencies & teams',
    features: [
      '10 profiles',
      'Team approvals',
      'Shared library',
      'Custom integrations',
      'Dedicated onboarding',
    ],
    cta: 'Contact sales',
    href: '/auth/signup',
    popular: false,
  },
];

export default function Pricing() {
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
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            delay: i * 0.1,
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
      id="pricing"
      className="relative py-20 lg:py-32 bg-[#070A12]"
      style={{ zIndex: 100 }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-4">
            Simple pricing
          </h2>
          <p className="text-base lg:text-lg text-[#A7B1D8] max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to scale.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              ref={(el) => { cardsRef.current[i] = el; }}
              className={`relative glass-card p-6 lg:p-8 ${
                plan.popular ? 'border-[#4F6DFF]/50' : ''
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F6DFF] text-white text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Most popular
                  </span>
                </div>
              )}

              {/* Glow effect for popular */}
              {plan.popular && (
                <div className="absolute inset-0 bg-[#4F6DFF]/10 rounded-[28px] blur-xl animate-pulse-glow" />
              )}

              <div className="relative">
                <h3 className="text-lg font-semibold text-[#F2F5FF] mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-[#A7B1D8] mb-4">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-[#F2F5FF]">
                    {plan.price}
                  </span>
                  <span className="text-[#A7B1D8]">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#27C696] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#A7B1D8]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.href}>
                  <Button
                    className={`w-full rounded-xl py-3 text-sm font-medium ${
                      plan.popular
                        ? 'bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white'
                        : 'bg-white/10 hover:bg-white/20 text-[#F2F5FF]'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

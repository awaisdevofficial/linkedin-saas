import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    description: 'Perfect for getting started',
    features: [
      '1 profile',
      '10 posts/mo',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get started',
    ctaVariant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'Most popular for professionals',
    features: [
      '3 profiles',
      'Unlimited posts',
      'Advanced analytics',
      'AI drafts',
      'Priority support',
    ],
    cta: 'Start Pro trial',
    ctaVariant: 'default' as const,
    popular: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/mo',
    description: 'For teams and agencies',
    features: [
      '10 profiles',
      'Team approvals',
      'Shared library',
      'Custom integrations',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    ctaVariant: 'outline' as const,
    popular: false,
  },
];

const Pricing = () => {
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
        { y: 20, opacity: 0 },
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
      const cardElements = cards.querySelectorAll('.pricing-card');
      cardElements.forEach((card, i) => {
        gsap.fromTo(card,
          { y: 50, opacity: 0, rotateX: 8 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.6,
            delay: i * 0.12,
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
      id="pricing"
      className="relative w-full bg-[#F6F8FC] py-24 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#6366F1] font-medium mb-4">
            Pricing
          </p>
          <h2 className="text-[clamp(32px,3.6vw,52px)] font-bold text-[#10153E] max-w-[600px] mx-auto">
            Start free. Upgrade when you're ready to scale.
          </h2>
        </div>

        {/* Cards */}
        <div 
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`pricing-card relative bg-white rounded-[28px] p-8 border ${
                plan.popular 
                  ? 'border-t-4 border-t-[#6366F1] border-x-[#6B7098]/18 border-b-[#6B7098]/18' 
                  : 'border-[#6B7098]/18'
              } card-shadow`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-[#6366F1] text-white text-xs font-medium rounded-full">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#10153E] mb-1">{plan.name}</h3>
                <p className="text-sm text-[#6B7098]">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-[#10153E]">{plan.price}</span>
                <span className="text-[#6B7098]">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#27C696] flex-shrink-0" />
                    <span className="text-sm text-[#6B7098]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link to="/auth/signup">
                <Button 
                  variant={plan.ctaVariant}
                  className={`w-full h-12 rounded-full ${
                    plan.popular 
                      ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white' 
                      : 'border-[#6B7098]/30 hover:bg-[#F6F8FC]'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;

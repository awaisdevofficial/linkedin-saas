import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Get started with your LinkedIn content studio',
    features: [
      'Connect your LinkedIn account',
      'Post scheduling and calendar',
      'AI-generated post drafts',
      'Engagement activity (likes, comments, replies)',
      'Basic dashboard and analytics',
    ],
    cta: 'Get started free',
    ctaVariant: 'outline' as const,
    popular: true,
    icon: Zap,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Extended access and support',
    features: [
      'Everything in Free',
      'Extended post generation',
      'Image/video caption tools (with your API key)',
      'LinkedIn auto-reply automation (Pro)',
      '3-day free trial + self-serve billing',
    ],
    cta: 'Start 3-day free trial',
    ctaVariant: 'outline' as const,
    popular: false,
    icon: Users,
  },
  {
    name: 'Custom',
    price: '—',
    period: '',
    description: 'Tailored for teams or high volume',
    features: [
      'Custom limits and features',
      'Dedicated support',
      'Invoicing as agreed',
    ],
    cta: 'Contact us',
    ctaVariant: 'outline' as const,
    popular: false,
    icon: Mail,
  },
];

const PricingPage = () => {
  // Keep URL in sync with page: remove hash so we don't show /pricing#solutions
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-[#F6F8FC] overflow-x-hidden">
      <Navigation />

      <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#6366F1] font-medium mb-4">
            Pricing
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#10153E] mb-4 leading-tight">
            Simple pricing for your LinkedIn studio
          </h1>
          <p className="text-lg text-[#6B7098] max-w-2xl mx-auto">
            Start free. Paid plans and custom options are managed by us—contact support for details.
          </p>
        </div>
      </section>

      <section className="relative z-10 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-[28px] p-8 border bg-white transition-shadow hover:shadow-lg ${
                  plan.popular
                    ? 'border-t-4 border-t-[#6366F1] border-x-[#6B7098]/18 border-b-[#6B7098]/18 shadow-lg scale-[1.02] md:scale-105'
                    : 'border-[#6B7098]/18'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-[#6366F1] text-white text-xs font-semibold rounded-full shadow-sm">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular ? 'bg-[#6366F1]/10 text-[#6366F1]' : 'bg-[#6B7098]/10 text-[#6B7098]'
                  }`}>
                    <plan.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#10153E]">{plan.name}</h2>
                    <p className="text-sm text-[#6B7098]">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#10153E]">{plan.price}</span>
                  {plan.period && <span className="text-[#6B7098]">{plan.period}</span>}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#27C696] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#6B7098]">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === 'Free' ? (
                  <Link to="/auth/signup" className="block">
                    <Button
                      variant={plan.ctaVariant}
                      size="lg"
                      className={`w-full h-12 rounded-full text-base font-medium ${
                        plan.popular
                          ? 'bg-[#6366F1] hover:bg-[#4F46E5] text-white'
                          : 'border-[#6B7098]/30 hover:bg-[#F6F8FC] text-[#10153E]'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : plan.name === 'Pro' ? (
                  <Link to="/billing" className="block">
                    <Button
                      variant={plan.ctaVariant}
                      size="lg"
                      className="w-full h-12 rounded-full text-base font-medium border-[#6B7098]/30 hover:bg-[#F6F8FC] text-[#10153E]"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <a href="mailto:support@postora.io" className="block">
                    <Button
                      variant={plan.ctaVariant}
                      size="lg"
                      className="w-full h-12 rounded-full text-base font-medium border-[#6B7098]/30 hover:bg-[#F6F8FC] text-[#10153E]"
                    >
                      {plan.cta}
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#6B7098] mt-10 max-w-xl mx-auto">
            Plans and features are as offered in the product. We do not charge automatically; paid access and invoices are as agreed. See our <Link to="/terms-and-conditions" className="text-[#6366F1] hover:underline">Terms of Service</Link>, <Link to="/privacy-policy" className="text-[#6366F1] hover:underline">Privacy Policy</Link> and <Link to="/refund-policy" className="text-[#6366F1] hover:underline">Refund Policy</Link>.
          </p>
          <p className="text-center text-sm text-[#6B7098] mt-3 max-w-xl mx-auto">
            By signing up you agree to our <Link to="/terms-and-conditions" className="text-[#6366F1] hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-[#6366F1] hover:underline">Privacy Policy</Link>. Please read and accept them on the signup page.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default PricingPage;

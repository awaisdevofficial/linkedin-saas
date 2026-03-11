import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'Is PostPilot safe for my LinkedIn account?',
    answer: 'Absolutely. PostPilot uses official LinkedIn APIs and follows all platform guidelines. We never store your password and use minimal permissions. Your account security is our top priority.',
  },
  {
    question: 'Can I schedule carousels and documents?',
    answer: 'Yes! PostPilot supports all LinkedIn post types including text posts, single images, carousels (multi-image posts), documents (PDFs), and even video content.',
  },
  {
    question: 'What happens when I hit my post limit?',
    answer: 'On the free plan, you\'ll need to wait until next month or upgrade to Pro for unlimited scheduling. We\'ll notify you when you\'re approaching your limit so there are no surprises.',
  },
  {
    question: 'Do you support agency/client management?',
    answer: 'Yes, our Team plan is built for agencies. Manage multiple client profiles, set up approval workflows, and keep everything organized with shared libraries and workspaces.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Of course. There are no long-term contracts. You can cancel your subscription at any time, and you\'ll continue to have access until the end of your billing period.',
  },
];

export default function FAQ() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

      // Items animation
      itemsRef.current.forEach((item, i) => {
        if (!item) return;
        gsap.fromTo(
          item,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            delay: i * 0.08,
            scrollTrigger: {
              trigger: item,
              start: 'top 90%',
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
      id="faq"
      className="relative py-20 lg:py-32 bg-[#0B1022]"
      style={{ zIndex: 100 }}
    >
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-4">
            Questions? Answers.
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              ref={(el) => { itemsRef.current[i] = el; }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 lg:p-6 text-left"
              >
                <span className="text-base lg:text-lg font-medium text-[#F2F5FF] pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#A7B1D8] flex-shrink-0 transition-transform duration-300 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? 'max-h-48' : 'max-h-0'
                }`}
              >
                <p className="px-5 lg:px-6 pb-5 lg:pb-6 text-[#A7B1D8] leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

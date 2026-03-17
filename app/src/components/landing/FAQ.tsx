import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: 'Is this safe for my LinkedIn account?',
    answer: 'Yes. We use official LinkedIn APIs and secure session management. Your credentials are encrypted and we only request the minimum permissions needed to post and engage on your behalf. Thousands of professionals trust PostPilot daily.',
  },
  {
    question: 'Can I schedule carousels?',
    answer: 'Absolutely! PostPilot supports all LinkedIn post types including single images, carousels (multi-image posts), videos, and text-only posts. Our carousel builder makes it easy to upload and arrange multiple slides.',
  },
  {
    question: 'Is there a post limit?',
    answer: 'Starter plans include 10 posts per month. Pro and Team plans offer unlimited posts. We recommend staying within LinkedIn\'s own rate limits to ensure optimal delivery and engagement.',
  },
  {
    question: 'Do you support agencies?',
    answer: 'Yes! Our Team plan is built for agencies with features like client workspaces, approval workflows, shared content libraries, and team member roles. Contact us for custom enterprise solutions.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no penalties. Your data remains accessible for 30 days after cancellation, and you can export everything before leaving.',
  },
];

const FAQ = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const accordion = accordionRef.current;

    if (!section || !header || !accordion) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(header,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          scrollTrigger: {
            trigger: header,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Accordion items animation
      const items = accordion.querySelectorAll('.faq-item');
      items.forEach((item, i) => {
        gsap.fromTo(item,
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            delay: i * 0.08,
            scrollTrigger: {
              trigger: item,
              start: 'top 90%',
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
      id="faq"
      className="relative w-full bg-[#F6F8FC] py-24 z-50"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <p className="mono text-xs uppercase tracking-[0.12em] text-[#2D5AF6] font-medium mb-4">
            FAQ
          </p>
          <h2 className="text-[clamp(32px,3.6vw,52px)] font-bold text-[#10153E]">
            Questions? Answers.
          </h2>
        </div>

        {/* Accordion */}
        <div ref={accordionRef}>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`}
                className="faq-item bg-white rounded-[18px] px-6 border border-[#6B7098]/18 card-shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="text-left text-[#10153E] font-semibold hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#6B7098] pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;

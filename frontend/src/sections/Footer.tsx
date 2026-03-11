import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Mail, Twitter, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

export default function Footer() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ctaRef.current,
        { scale: 0.98, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={sectionRef}
      className="relative py-20 lg:py-32 bg-[#070A12]"
      style={{ zIndex: 100 }}
    >
      {/* Large indigo radial gradient behind CTA */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,109,255,0.12)_0%,_transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA Block */}
        <div ref={ctaRef} className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#F2F5FF] leading-[1.1] tracking-[-0.02em] mb-4">
            Ready to own your LinkedIn presence?
          </h2>
          <p className="text-base lg:text-lg text-[#A7B1D8] max-w-xl mx-auto mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button
                size="lg"
                className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-xl px-8 py-3 text-base font-medium shadow-lg shadow-[#4F6DFF]/25"
              >
                Start free trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 text-[#F2F5FF] hover:bg-white/10 rounded-xl px-8 py-3 text-base font-medium"
            >
              Or book a 15-min call
            </Button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="border-t border-white/[0.06] pt-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LF</span>
                </div>
                <span className="text-xl font-semibold text-[#F2F5FF]">PostPilot</span>
              </Link>
              <p className="text-sm text-[#A7B1D8] leading-relaxed">
                Your LinkedIn content studio, on autopilot.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-[#F2F5FF] mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-[#F2F5FF] mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="text-sm font-semibold text-[#F2F5FF] mb-4">Connect</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:support@postpilot.io"
                    className="flex items-center gap-2 text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    support@postpilot.io
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                    @postpilot
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors"
                  >
                    <Activity className="w-4 h-4" />
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#A7B1D8]">
              &copy; {new Date().getFullYear()} PostPilot. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-[#A7B1D8] hover:text-[#F2F5FF] transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

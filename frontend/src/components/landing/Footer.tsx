import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Mail, Twitter } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integrations', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  connect: {
    title: 'Connect',
    links: [
      { label: 'support@postpilot.io', href: 'mailto:support@postpilot.io', icon: Mail },
      { label: '@postpilot', href: '#', icon: Twitter },
      { label: 'Status', href: '#' },
    ],
  },
};

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      const columns = footer.querySelectorAll('.footer-column');
      columns.forEach((col, i) => {
        gsap.fromTo(col,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            delay: i * 0.1,
            scrollTrigger: {
              trigger: col,
              start: 'top 95%',
              toggleActions: 'play none none reverse',
            }
          }
        );
      });
    }, footer);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative w-full bg-white py-16 z-[70]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo Column */}
          <div className="footer-column col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center">
                <span className="text-white font-bold text-sm">PP</span>
              </div>
              <span className="font-semibold text-lg text-[#10153E]">PostPilot</span>
            </Link>
            <p className="text-sm text-[#6B7098]">
              Your LinkedIn content studio, on autopilot.
            </p>
          </div>

          {/* Product */}
          <div className="footer-column">
            <h4 className="font-semibold text-[#10153E] mb-4">{footerLinks.product.title}</h4>
            <ul className="space-y-2">
              {footerLinks.product.links.map((link, i) => (
                <li key={i}>
                  <a 
                    href={link.href}
                    className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="footer-column">
            <h4 className="font-semibold text-[#10153E] mb-4">{footerLinks.company.title}</h4>
            <ul className="space-y-2">
              {footerLinks.company.links.map((link, i) => (
                <li key={i}>
                  <a 
                    href={link.href}
                    className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="footer-column">
            <h4 className="font-semibold text-[#10153E] mb-4">{footerLinks.connect.title}</h4>
            <ul className="space-y-2">
              {footerLinks.connect.links.map((link, i) => (
                <li key={i}>
                  <a 
                    href={link.href}
                    className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors inline-flex items-center gap-2"
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#6B7098]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#6B7098]">
            © {new Date().getFullYear()} PostPilot. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-[#6B7098] hover:text-[#10153E] transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

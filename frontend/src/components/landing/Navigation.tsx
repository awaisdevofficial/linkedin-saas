import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: '#features' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'Resources', href: '#faq' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass border-b border-border/50'
          : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between min-h-14 sm:h-16 px-4 sm:px-6 lg:px-8 xl:px-12 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 min-h-[44px] -ml-2 items-center justify-start touch-manipulation py-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F6DFF] to-[#27C696] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">PP</span>
          </div>
          <span className="font-semibold text-lg text-[#10153E]">PostPilot</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#6B7098] hover:text-[#10153E] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/auth/login">
            <Button variant="ghost" className="text-[#6B7098] hover:text-[#10153E]">
              Sign in
            </Button>
          </Link>
          <Link to="/auth/signup">
            <Button className="bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white rounded-full px-5">
              Get started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button - 44px touch target */}
        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#10153E]/5 active:bg-[#10153E]/10 transition-colors touch-manipulation"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-[#10153E]" />
          ) : (
            <Menu className="w-6 h-6 text-[#10153E]" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden glass border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-3 px-2 -mx-2 min-h-[44px] flex items-center text-[#6B7098] hover:text-[#10153E] hover:bg-[#10153E]/5 rounded-lg active:bg-[#10153E]/10 touch-manipulation"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-border/50 space-y-2">
              <Link to="/auth/login" className="block w-full" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full min-h-[44px] touch-manipulation">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth/signup" className="block w-full" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full min-h-[44px] bg-[#4F6DFF] hover:bg-[#3D5AEB] text-white touch-manipulation">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;

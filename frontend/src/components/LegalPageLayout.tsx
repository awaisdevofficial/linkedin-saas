import { useEffect } from 'react';
import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';

type LegalPageLayoutProps = {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
  // Keep URL in sync: remove hash so we don't show /terms-and-conditions#solutions etc.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-[#F6F8FC] overflow-x-hidden">
      <Navigation />
      <article className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#10153E] mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-[#6B7098] mb-10">Last updated: {lastUpdated}</p>
          )}
          <div className="prose prose-lg max-w-none text-[#10153E] space-y-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[#10153E] [&_p]:text-[#6B7098] [&_p]:leading-relaxed [&_ul]:text-[#6B7098] [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1">
            {children}
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
};

export default LegalPageLayout;

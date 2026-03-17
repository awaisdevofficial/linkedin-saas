import { Construction, Sparkles } from 'lucide-react';

type Props = {
  message?: string;
  title?: string;
};

const defaultTitles: Record<string, string> = {
  coming_soon: "We're building something great",
  maintenance: 'Temporarily unavailable',
  custom: 'Page unavailable',
};

export function FeatureDisabledPage({ message = 'Coming soon', title }: Props) {
  const isMaintenance = message.toLowerCase().includes('maintenance') || message === 'In maintenance';
  const Icon = isMaintenance ? Construction : Sparkles;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-[#6366F1]" />
        </div>
        <h2 className="text-xl font-semibold text-[#10153E] mb-2">
          {title || (isMaintenance ? 'In maintenance' : "Coming soon")}
        </h2>
        <p className="text-[#6B7098]">{message}</p>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Quote } from 'lucide-react';

const QUOTES = [
  { text: 'Content is the bridge between your expertise and your audience.', author: 'Unknown' },
  { text: 'Consistency beats intensity. Show up, post, engage.', author: 'LinkedIn wisdom' },
  { text: 'Your network is your net worth. Nurture it with great content.', author: 'Unknown' },
  { text: 'The best time to post was yesterday. The second best is now.', author: 'Unknown' },
  { text: 'Quality content + consistency = growth.', author: 'Postora' },
  { text: 'Share what you know. Someone is waiting to learn it.', author: 'Unknown' },
  { text: 'Small steps, scheduled well, lead to big results.', author: 'Postora' },
  { text: 'Engagement is a two-way street. Start the conversation.', author: 'Unknown' },
];

function getQuoteForDay(): (typeof QUOTES)[number] {
  const start = new Date(2025, 0, 1);
  const now = new Date();
  const dayIndex = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return QUOTES[dayIndex % QUOTES.length];
}

type InspirationalQuoteProps = {
  variant?: 'inline' | 'card';
  className?: string;
};

export function InspirationalQuote({ variant = 'card', className = '' }: InspirationalQuoteProps) {
  const quote = useMemo(() => getQuoteForDay(), []);

  if (variant === 'inline') {
    return (
      <p className={`text-sm text-[#6B7098] italic ${className}`}>
        &ldquo;{quote.text}&rdquo;
        {quote.author && <span className="not-italic text-[#6B7098]/80"> — {quote.author}</span>}
      </p>
    );
  }

  return (
    <div className={`rounded-xl border border-[#6B7098]/10 bg-white/80 p-4 card-shadow ${className}`}>
      <Quote className="w-8 h-8 text-[#6366F1]/30 mb-2" />
      <p className="text-sm text-[#10153E] font-medium">&ldquo;{quote.text}&rdquo;</p>
      {quote.author && <p className="text-xs text-[#6B7098] mt-1">— {quote.author}</p>}
    </div>
  );
}

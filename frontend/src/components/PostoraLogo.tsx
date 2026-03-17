/**
 * Postora brand logo — horizontal (navbar), stacked (landing/cards), icon (app/favicon), dark (inverted).
 * Accent: indigo #6366F1 (suggests "post" / send).
 */

const ACCENT = '#6366F1';
const MARK_DARK = '#2D3142'; /* dark bluish-grey circle */
const MARK_LIGHT = '#FFFFFF';
const TEXT_PRIMARY = '#10153E';
const TEXT_MUTED = '#6B7098';

type Variant = 'horizontal' | 'stacked' | 'icon' | 'dark';

export interface PostoraLogoProps {
  variant?: Variant;
  className?: string;
  /** Hide tagline for compact horizontal (e.g. sidebar) */
  showTagline?: boolean;
  /** Size scale: 'sm' | 'md' | 'lg' (icon uses size for width/height) */
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { mark: 28, wordmark: 'text-base', tagline: 'text-[10px]' },
  md: { mark: 32, wordmark: 'text-lg', tagline: 'text-xs' },
  lg: { mark: 40, wordmark: 'text-xl', tagline: 'text-sm' },
};

function LogoMark({
  size,
  dark,
  className = '',
}: {
  size: number;
  dark?: boolean;
  className?: string;
}) {
  const r = size / 2;
  const dotR = Math.max(2, size * 0.1);
  const dotCx = r + size * 0.18;
  const dotCy = r + size * 0.2;
  const fill = dark ? MARK_DARK : MARK_LIGHT;
  const letterFill = dark ? MARK_LIGHT : TEXT_PRIMARY;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx={r} cy={r} r={r - 1} fill={fill} />
        <text
          x={r}
          y={r}
          textAnchor="middle"
          dominantBaseline="central"
          fill={letterFill}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize={size * 0.48}
        >
          P
        </text>
        <circle cx={dotCx} cy={dotCy} r={dotR} fill={ACCENT} />
      </svg>
    </span>
  );
}

export function PostoraLogo({
  variant = 'horizontal',
  className = '',
  showTagline = true,
  size = 'md',
}: PostoraLogoProps) {
  const s = sizes[size];
  const isDark = variant === 'dark';

  if (variant === 'icon') {
    return (
      <span className={`inline-flex ${className}`} aria-label="Postora">
        <LogoMark size={s.mark} dark={!isDark} />
      </span>
    );
  }

  const wordmarkClass = `font-semibold uppercase tracking-wide text-[#10153E] ${s.wordmark}`;
  const wordmarkClassDark = `font-semibold uppercase tracking-wide text-white ${s.wordmark}`;
  const taglineClass = `font-medium uppercase tracking-wider text-[#6B7098] ${s.tagline}`;
  const taglineClassDark = `font-medium uppercase tracking-wider text-[#9CA3AF] ${s.tagline}`;

  const wordmark = (
    <span className={isDark ? wordmarkClassDark : wordmarkClass}>POSTORA</span>
  );
  const tagline = showTagline ? (
    <span className={isDark ? taglineClassDark : taglineClass}>
      LINKEDIN STUDIO
    </span>
  ) : null;

  if (variant === 'stacked') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 ${className}`}
        aria-label="Postora - LinkedIn Content Studio"
      >
        <LogoMark size={s.mark} dark={!isDark} />
        {wordmark}
        {tagline}
      </div>
    );
  }

  // horizontal (default) and dark
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      aria-label="Postora - LinkedIn Content Studio"
    >
      <LogoMark size={s.mark} dark={!isDark} />
      <div className="flex flex-col leading-tight">
        {wordmark}
        {tagline}
      </div>
    </div>
  );
}

export default PostoraLogo;

export function AuthWaveBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-bg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-bg via-bg to-slate-100/70" />

      <div className="absolute -left-[12%] top-[8%] h-[58vh] w-[58vw] rounded-full bg-accent/[0.08] blur-[88px] animate-wave-float-1 motion-reduce:animate-none" />
      <div className="absolute -right-[8%] top-[18%] h-[48vh] w-[48vw] rounded-full bg-violet-400/[0.07] blur-[96px] animate-wave-float-2 motion-reduce:animate-none" />
      <div className="absolute bottom-[6%] left-[12%] h-[52vh] w-[52vw] rounded-full bg-rose-300/[0.06] blur-[104px] animate-wave-float-3 motion-reduce:animate-none" />
      <div className="absolute bottom-[14%] right-[10%] h-[42vh] w-[42vw] rounded-full bg-teal-300/[0.06] blur-[92px] animate-wave-float-4 motion-reduce:animate-none" />
      <div className="absolute left-[35%] top-[42%] h-[36vh] w-[36vw] rounded-full bg-amber-200/[0.05] blur-[80px] animate-wave-float-2 motion-reduce:animate-none [animation-delay:-8s]" />

      <div className="absolute inset-x-0 bottom-0 h-[42%] opacity-[0.55]">
        <div className="flex h-full w-[200%] animate-wave-drift motion-reduce:animate-none">
          <WaveLayer idPrefix="auth-wave-primary-1" className="w-1/2" />
          <WaveLayer idPrefix="auth-wave-primary-2" className="w-1/2" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[32%] opacity-40">
        <div className="flex h-full w-[200%] animate-wave-drift motion-reduce:animate-none [animation-duration:55s] [animation-direction:reverse]">
          <WaveLayerSecondary idPrefix="auth-wave-secondary-1" className="w-1/2" />
          <WaveLayerSecondary idPrefix="auth-wave-secondary-2" className="w-1/2" />
        </div>
      </div>
    </div>
  );
}

function WaveLayer({
  idPrefix,
  className,
}: {
  idPrefix: string;
  className?: string;
}) {
  const gradientId = `${idPrefix}-gradient`;

  return (
    <svg
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 1440 320"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
          <stop offset="45%" stopColor="#8b5cf6" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.11" />
        </linearGradient>
      </defs>
      <path
        d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

function WaveLayerSecondary({
  idPrefix,
  className,
}: {
  idPrefix: string;
  className?: string;
}) {
  const gradientId = `${idPrefix}-gradient`;

  return (
    <svg
      className={className}
      preserveAspectRatio="none"
      viewBox="0 0 1440 320"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.09" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.09" />
        </linearGradient>
      </defs>
      <path
        d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,224C840,235,960,245,1080,234.7C1200,224,1320,192,1380,176L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

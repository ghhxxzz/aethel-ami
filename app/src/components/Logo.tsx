/** Estrela de quatro pontas: a marca do Aethel A.M.I. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="aethel-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 C34 22 42 30 62 32 C42 34 34 42 32 62 C30 42 22 34 2 32 C22 30 30 22 32 2 Z"
        fill="url(#aethel-g)"
      />
      <circle cx="32" cy="32" r="4" fill="var(--bg)" opacity="0.85" />
    </svg>
  );
}

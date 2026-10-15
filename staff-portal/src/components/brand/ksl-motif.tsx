/** Faint seal-style artwork matching the public site about-section motif. */
export function KslMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="100" cy="100" r="95" stroke="#14213d" strokeWidth="2" strokeDasharray="2.6 1.4" opacity="0.35" />
      <circle cx="100" cy="100" r="68" stroke="#0A3E95" strokeWidth="1.2" opacity="0.25" />
      <circle cx="100" cy="100" r="88" stroke="#14213d" strokeWidth="0.5" opacity="0.2" />
      <path
        d="M100 28 L108 72 L152 72 L116 98 L128 142 L100 116 L72 142 L84 98 L48 72 L92 72 Z"
        stroke="#99792c"
        strokeWidth="1.2"
        fill="none"
        opacity="0.2"
      />
      <text
        fill="#09296C"
        fontFamily="Georgia, serif"
        fontSize="8"
        letterSpacing="2"
        opacity="0.35"
        textAnchor="middle"
        x="100"
        y="108"
      >
        KENYA SHIPYARDS
      </text>
    </svg>
  );
}

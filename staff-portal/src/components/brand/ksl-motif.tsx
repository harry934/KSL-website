/** Faint anchor line-art (matches public site `data-ksl-motif` anchor). */
export function KslAnchorMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="80" cy="20" r="11" stroke="#14213d" strokeWidth="2.2" />
      <path d="M76 31h8v164h-8z" stroke="#14213d" strokeWidth="1.4" />
      <path d="M34 46h92" stroke="#0A3E95" strokeWidth="4" />
      <circle cx="31" cy="46" r="4" stroke="#14213d" strokeWidth="1.4" />
      <circle cx="129" cy="46" r="4" stroke="#14213d" strokeWidth="1.4" />
      <path d="M22 150Q26 204 80 206Q134 204 138 150" stroke="#14213d" strokeWidth="3.2" />
      <path d="M22 150l-10 14M22 150l16 6M138 150l10 14M138 150l-16 6" stroke="#99792c" strokeWidth="2.4" />
      <path d="M80 200l-6 14h12z" fill="#99792c" />
      <path
        d="M86 14C126 26 124 58 84 66C40 74 40 102 80 110C122 118 122 146 84 154C52 160 50 178 72 186C92 192 110 186 118 200C126 212 118 224 104 224"
        stroke="#0165FC"
        strokeWidth="3.5"
        opacity="0.45"
      />
    </svg>
  );
}

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

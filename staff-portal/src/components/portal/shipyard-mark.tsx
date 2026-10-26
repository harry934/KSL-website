/** Faint ship and crane, drawn in the same line style as the public website. */
export function ShipyardMark() {
  return (
    <svg className="shipyard-mark" viewBox="0 0 640 300" aria-hidden>
      <path d="M36 248c22-14 38-14 60 0s38 14 60 0 38-14 60 0 38 14 60 0 38-14 60 0 38 14 60 0 38-14 60 0 38 14 60 0" opacity="0.7" />
      <g transform="translate(72 96) scale(8)">
        <path d="M3.2 14.4 5.8 18h12.4l2.6-3.6H3.2z" />
        <path d="M8 14.4V11.4h7.4v3" />
        <path d="M11.4 11.4V7.2" />
        <path d="M11.4 7.2h4.6L14 8.8l2 1.6h-4.6" />
      </g>
      <g transform="translate(392 72) scale(8)">
        <path d="M6 21V3" />
        <path d="M3 5.5h18" />
        <path d="M6 3 3 5.5" />
        <path d="m6 3 15 2.5" />
        <path d="M17.5 5.5v6" />
        <path d="M15.5 11.5h4v3h-4z" />
        <path d="M2.5 21h7" />
        <path d="m6 10 4.5-4.5" />
      </g>
    </svg>
  );
}

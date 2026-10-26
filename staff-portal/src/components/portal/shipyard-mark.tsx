/** The circular seal used as a faint watermark on the public About section. */
export function ShipyardMark() {
  return (
    <svg className="shipyard-mark" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <path id="ksl-seal-top" d="M23 100A77 77 0 0 1 177 100" />
        <path id="ksl-seal-bottom" d="M16 100A84 84 0 0 0 184 100" />
      </defs>
      <g fill="none" stroke="#14213d" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="100" cy="100" r="95" strokeWidth="5" strokeDasharray="2.6 1.4" strokeLinecap="butt" />
        <circle cx="100" cy="100" r="98.6" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="91.4" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="88" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="68" strokeWidth="0.9" />
        <circle cx="100" cy="100" r="65" strokeWidth="0.35" />
        <g fill="#14213d" stroke="none" fontFamily="Georgia, serif" fontSize="9.5" letterSpacing="2.4">
          <text textAnchor="middle">
            <textPath href="#ksl-seal-top" startOffset="50%">
              KENYA SHIPYARDS LIMITED
            </textPath>
          </text>
          <text textAnchor="middle">
            <textPath href="#ksl-seal-bottom" startOffset="50%">
              MOMBASA · KISUMU
            </textPath>
          </text>
          <path d="M18 100L22 96.5L26 100L22 103.5ZM174 100L178 96.5L182 100L178 103.5Z" />
        </g>
        <g fill="#14213d" stroke="none">
          <rect x="74" y="66" width="52" height="6" rx="3" />
          <circle cx="73" cy="69" r="4" />
          <circle cx="127" cy="69" r="4" />
          <path d="M97 60H103L104.5 140H95.5Z" />
          <path d="M62 118C64 140 80 152 100 152C120 152 136 140 138 118H132C130 136 116 145 100 145C84 145 70 136 68 118Z" />
          <path d="M65 102L75 125L65 119L55 125ZM135 102L145 125L135 119L125 125ZM95 150L100 159L105 150Z" />
        </g>
        <circle cx="100" cy="53" r="6" strokeWidth="3" />
        <path d="M106 55C122 58 122 78 108 84C94 90 86 98 92 108C98 118 112 118 110 130" stroke="#fff" strokeWidth="5" />
        <path d="M106 55C122 58 122 78 108 84C94 90 86 98 92 108C98 118 112 118 110 130" strokeWidth="2.4" strokeDasharray="2.2 1" strokeLinecap="butt" />
        <path d="M30 100H36M164 100H170" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

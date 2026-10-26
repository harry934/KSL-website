/** A quiet line drawing of the yard, sitting in the empty part of the dashboard. */
export function ShipyardMark() {
  return (
    <svg className="shipyard-mark" viewBox="0 0 680 380" fill="none" aria-hidden>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M48 292c48 10 96-8 148 2s92 14 140 2 96-16 148-2 92 10 148 0" strokeWidth="1.2" />
        <path d="M36 308c56 8 104-6 160 4s100 12 152 2 104-14 156-2 88 8 140-2" strokeWidth="1" opacity="0.7" />
        <path d="M92 286V248h392" strokeWidth="1.4" />
        <path d="M118 248v-18h86v18" strokeWidth="1.25" />
        <path d="M132 230v-22h58v22" strokeWidth="1.15" />
        <path d="M146 208h30" strokeWidth="1.15" />
        <path d="M214 248l86-28h168l28 28" strokeWidth="1.5" />
        <path d="M248 232v-36M292 224v-28M336 220v-24M380 224v-28M424 232v-36" strokeWidth="1" />
        <path d="M248 196h176" strokeWidth="1" />
        <path d="M214 248c18 22 46 34 86 36h92c28-2 52-12 70-36" strokeWidth="1.35" />
        <path d="M508 248v-92" strokeWidth="1.5" />
        <path d="M508 168h-132" strokeWidth="1.5" />
        <path d="M508 156v-28M492 128h32" strokeWidth="1.25" />
        <path d="M376 168v28" strokeWidth="1.15" />
        <path className="shipyard-mark-gold" d="M376 196v8" strokeWidth="1.4" />
        <circle className="shipyard-mark-gold" cx="376" cy="210" r="3.2" strokeWidth="1.2" />
        <path d="M92 248h28M164 248h22" strokeWidth="1" />
      </g>
    </svg>
  );
}

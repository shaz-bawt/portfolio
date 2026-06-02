// Original abstract role icons. Bold, filled, console-UI styled.
// Each evokes a role's genre/domain, not any company brand or logo.
(function () {
  const A='var(--accent)', A2='var(--accent-2)', A3='var(--accent-3)', AM='var(--amber)';
  // gradient defs reused per-icon via unique ids
  const wrap = (id, body, defs='') => `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}<linearGradient id="g${id}" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="${A}"/><stop offset="1" stop-color="${A2}"/></linearGradient></defs>${body}</svg>`;

  const icons = {
    // TELEMETRY (PlayStation): broadcast tower emitting concentric signal rings
    telemetry: wrap('tel', `
      <circle cx="32" cy="40" r="16" fill="url(#gtel)" opacity=".18"/>
      <path d="M22 30a14 14 0 0 1 20 0" stroke="${A3}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M16 24a22 22 0 0 1 32 0" stroke="${A}" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
      <path d="M32 40l4-16h-8l4 16z" fill="url(#gtel)"/>
      <circle cx="32" cy="22" r="4" fill="#fff"/>
      <circle cx="32" cy="44" r="3" fill="${A3}"/>`),

    // INSIGHTS (ZeniMax/AAA): solid bar chart with a rising trend line
    insights: wrap('ins', `
      <rect x="12" y="36" width="9" height="16" rx="2" fill="${A}" opacity=".55"/>
      <rect x="27" y="28" width="9" height="24" rx="2" fill="${A3}" opacity=".7"/>
      <rect x="42" y="18" width="9" height="34" rx="2" fill="url(#gins)"/>
      <path d="M14 34l13-9 11 4 9-15" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="47" cy="14" r="3.5" fill="#fff"/>`),

    // LIVE-SERVICE (HiDef): bold equalizer / pulse bars
    rhythm: wrap('rhy', `
      <rect x="12" y="26" width="7" height="12" rx="3.5" fill="${A}"/>
      <rect x="22" y="18" width="7" height="28" rx="3.5" fill="${A3}"/>
      <rect x="32" y="10" width="7" height="44" rx="3.5" fill="url(#grhy)"/>
      <rect x="42" y="20" width="7" height="24" rx="3.5" fill="${A2}"/>
      <rect x="52" y="28" width="0" height="0"/>`),

    // MMO (Guild Wars 2): bold shield crest with a sword
    mmo: wrap('mmo', `
      <path d="M32 8l18 6v12c0 13-8 20-18 24-10-4-18-11-18-24V14l18-6z" fill="url(#gmmo)" opacity=".22"/>
      <path d="M32 8l18 6v12c0 13-8 20-18 24-10-4-18-11-18-24V14l18-6z" stroke="url(#gmmo)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M32 18v22" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M25 26l7-5 7 5" stroke="${A3}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="44" r="2.5" fill="${A3}"/>`),

    // ANALYTICS (Gearbox/SciPlay): connected data nodes forming a network
    analytics: wrap('ana', `
      <path d="M16 44L32 18l16 22" stroke="url(#gana)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/>
      <path d="M16 44h32" stroke="${A2}" stroke-width="3" stroke-linecap="round" opacity=".4"/>
      <circle cx="16" cy="44" r="6" fill="${A}"/>
      <circle cx="32" cy="18" r="6" fill="${A3}"/>
      <circle cx="48" cy="40" r="6" fill="${A2}"/>
      <circle cx="32" cy="18" r="2.5" fill="#0a0c12"/>`),

    // QA (Sony/EA): bug under a magnifier (testing / finding defects)
    qa: wrap('qa', `
      <circle cx="27" cy="27" r="17" fill="url(#gqa)" opacity=".16"/>
      <circle cx="27" cy="27" r="17" stroke="url(#gqa)" stroke-width="3.5"/>
      <path d="M40 40l11 11" stroke="${A}" stroke-width="4.5" stroke-linecap="round"/>
      <ellipse cx="27" cy="28" rx="5" ry="6.5" fill="${AM}"/>
      <path d="M27 21v-4M20 24l-3-2M34 24l3-2M20 32l-3 2M34 32l3 2M27 35v3" stroke="${AM}" stroke-width="2.5" stroke-linecap="round"/>`),

    // FOUNDATIONS (Zynga security + Sparkplay design): interlocking blocks / base
    foundations: wrap('fnd', `
      <path d="M32 6l22 11-22 11-22-11 22-11z" fill="url(#gfnd)"/>
      <path d="M32 6l22 11-22 11-22-11 22-11z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" opacity=".4"/>
      <path d="M10 28l22 11 22-11" stroke="${A3}" stroke-width="3.5" stroke-linejoin="round" opacity=".8"/>
      <path d="M10 39l22 11 22-11" stroke="${A2}" stroke-width="3.5" stroke-linejoin="round" opacity=".55"/>`),
  };

  document.querySelectorAll('.ricon[data-icon]').forEach(el => {
    const k = el.getAttribute('data-icon');
    if (icons[k]) el.innerHTML = icons[k];
  });
})();

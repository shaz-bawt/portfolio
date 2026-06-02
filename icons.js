// Original abstract SVG icons. Each represents a role's genre/domain,
// not any company brand. All paths are hand-built generic glyphs.
// Usage: <span class="ricon" data-icon="telemetry"></span>
(function () {
  const A = 'var(--accent)', A2 = 'var(--accent-2)', A3 = 'var(--accent-3)', AM = 'var(--amber)';
  const S = (inner) => `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  const icons = {
    // PlayStation telemetry: signal waves radiating from a node
    telemetry: S(`
      <circle cx="24" cy="30" r="3.5" fill="${A}"/>
      <path d="M16 26a11 11 0 0 1 16 0" stroke="${A}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M11 21a18 18 0 0 1 26 0" stroke="${A2}" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>
      <path d="M6 16a25 25 0 0 1 36 0" stroke="${A3}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`),

    // ZeniMax / AAA insights: layered bar chart inside a frame
    insights: S(`
      <rect x="7" y="9" width="34" height="30" rx="3" stroke="${A2}" stroke-width="2.5"/>
      <rect x="13" y="24" width="4" height="9" rx="1.5" fill="${A}"/>
      <rect x="22" y="19" width="4" height="14" rx="1.5" fill="${A3}"/>
      <rect x="31" y="15" width="4" height="18" rx="1.5" fill="${A2}"/>`),

    // HiDef rhythm/dance live-service: equalizer waves
    rhythm: S(`
      <rect x="9" y="20" width="4.5" height="8" rx="2.25" fill="${A}"/>
      <rect x="17" y="14" width="4.5" height="20" rx="2.25" fill="${A3}"/>
      <rect x="25.5" y="9" width="4.5" height="30" rx="2.25" fill="${A2}"/>
      <rect x="34" y="17" width="4.5" height="14" rx="2.25" fill="${A}"/>`),

    // Guild Wars 2 / MMO: a sword crossed shield crest (generic fantasy)
    mmo: S(`
      <path d="M24 6l11 4v9c0 8-5 13-11 16-6-3-11-8-11-16v-9l11-4z" stroke="${A}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M24 14v16" stroke="${A3}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M19 22l5-3 5 3" stroke="${A2}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`),

    // Gearbox/SciPlay analytics build: nodes connected (data graph)
    analytics: S(`
      <circle cx="12" cy="34" r="3.5" stroke="${A}" stroke-width="2.5"/>
      <circle cx="24" cy="14" r="3.5" stroke="${A3}" stroke-width="2.5"/>
      <circle cx="36" cy="30" r="3.5" stroke="${A2}" stroke-width="2.5"/>
      <path d="M14.5 31.5L21.5 17M27 16l7 11" stroke="${A}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>`),

    // Foundations (QA/security/design): magnifier over a grid (finding the cracks)
    foundations: S(`
      <rect x="8" y="8" width="20" height="20" rx="3" stroke="${AM}" stroke-width="2.5"/>
      <path d="M13 14h10M13 19h10M13 24h6" stroke="${AM}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <circle cx="30" cy="30" r="7" stroke="${A}" stroke-width="2.5"/>
      <path d="M35 35l5 5" stroke="${A}" stroke-width="2.5" stroke-linecap="round"/>`),
  };

  document.querySelectorAll('.ricon[data-icon]').forEach(el => {
    const k = el.getAttribute('data-icon');
    if (icons[k]) el.innerHTML = icons[k];
  });
})();

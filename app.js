// ---- pixel starfield ----
(function () {
  const layer = document.querySelector('.stars');
  if (!layer) return;
  const n = Math.min(70, Math.floor(window.innerWidth / 18));
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3) + 's';
    if (Math.random() > 0.85) { s.style.width = '3px'; s.style.height = '3px'; s.style.background = Math.random() > .5 ? '#f4c95d' : '#4fd6c4'; }
    layer.appendChild(s);
  }
})();

// ---- reveal on scroll ----
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), (e.target.dataset.delay || 0) * 1); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(e => io.observe(e));
})();

// ---- animate stat bars when visible ----
(function () {
  const bars = document.querySelectorAll('.bar > i');
  if (!bars.length) return;
  bars.forEach(b => { b.style.transition = 'transform 1s cubic-bezier(.2,.9,.3,1)'; b.style.transform = 'scaleX(0)'; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const v = getComputedStyle(e.target).getPropertyValue('--v') || .8;
        e.target.style.transform = 'scaleX(' + v + ')';
        io.unobserve(e.target);
      }
    });
  }, { threshold: .5 });
  bars.forEach(b => io.observe(b));
})();

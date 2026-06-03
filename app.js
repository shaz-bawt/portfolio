// reveal on scroll
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const d = parseInt(e.target.dataset.delay || 0, 10);
        setTimeout(() => e.target.classList.add('in'), d);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(e => io.observe(e));
})();

// animate attribute tracks when visible
(function () {
  const bars = document.querySelectorAll('.track > i');
  if (!bars.length) return;
  const fill = (b) => { b.style.width = (Math.round((parseFloat(b.dataset.v || '0.8')) * 100)) + '%'; };
  // Fallback: ensure bars always fill even if observer never fires
  const fillAll = () => bars.forEach(fill);
  if (!('IntersectionObserver' in window)) { setTimeout(fillAll, 50); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { setTimeout(() => fill(e.target), 120); io.unobserve(e.target); }
    });
  }, { threshold: 0.25 });
  bars.forEach(b => io.observe(b));
  // Safety net: if anything is still empty shortly after load, fill it
  window.addEventListener('load', () => setTimeout(() => {
    bars.forEach(b => { if (!b.style.width || b.style.width === '0%') fill(b); });
  }, 1200));
})();

// active nav by filename
(function () {
  const here = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === here || (here === '' && href === 'index.html')) a.classList.add('active');
    else a.classList.remove('active');
  });
})();

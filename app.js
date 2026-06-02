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
  bars.forEach(b => {
    const v = b.dataset.v || '0.8';
    b.style.transform = 'scaleX(0)';
    b.style.transition = 'transform 1.1s cubic-bezier(.22,.61,.36,1)';
    b.dataset.target = v;
  });
  if (!('IntersectionObserver' in window)) { bars.forEach(b => b.style.transform = 'scaleX(' + b.dataset.target + ')'); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => { e.target.style.transform = 'scaleX(' + e.target.dataset.target + ')'; }, 150);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach(b => io.observe(b));
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

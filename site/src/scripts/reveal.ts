// Scroll reveal. Adds .is-in when sections enter the viewport.
// Uses IntersectionObserver, not scroll listeners.
// Safe under SSR: guards against non-browser environments.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  (function () {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  })();
}

let activeAnimations = new WeakMap();

export function smoothScrollTo(
  el,
  targetTop,
  duration = 220
) {
  if (!el) return;

  const startTop = el.scrollTop;
  const distance = targetTop - startTop;
  if (Math.abs(distance) < 2) return;

  const prev = activeAnimations.get(el);
  if (prev) cancelAnimationFrame(prev);

  const startTime = performance.now();

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(progress);

    el.scrollTop = startTop + distance * eased;

    if (progress < 1) {
      const id = requestAnimationFrame(step);
      activeAnimations.set(el, id);
    }
  };

  const id = requestAnimationFrame(step);
  activeAnimations.set(el, id);
}

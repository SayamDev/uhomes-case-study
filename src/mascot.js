// U: the uhomes mascot. The brand's own letter "u" drawn as a small brick student building:
// two towers with lit windows for eyes, a front door in the curve, a chimney for "home".
// No face beyond the windows, so it stays in the site's visual language. All motion is CSS
// (blink, smoke, hop), so it costs nothing when still and pauses with the rest when off screen.
let n = 0;
export function mascot({ size = 64, mood = 'calm', label = 'U, the uhomes helper', cls = '' } = {}) {
  const id = 'u' + ++n;
  return `<span class="u-mascot ${cls}" data-mood="${mood}" style="--u:${size}px" role="img" aria-label="${label}">
  <svg viewBox="0 -10 120 134" aria-hidden="true">
    <defs><pattern id="${id}b" width="14" height="8" patternUnits="userSpaceOnUse"><path d="M0 7.5h14M7 0v7.5" stroke="rgba(80,16,14,.18)" stroke-width="1"/></pattern></defs>
    <g class="u-smoke"><circle cx="96" cy="-2" r="3.5"/><circle cx="100" cy="-8" r="2.6"/></g>
    <rect class="u-chim" x="92" y="2" width="7" height="13" rx="1"/>
    <g class="u-body">
      <path class="u-wall" d="M20 18H50V70a10 10 0 0 0 20 0V18H100V74a40 38 0 0 1-80 0Z"/>
      <path d="M20 18H50V70a10 10 0 0 0 20 0V18H100V74a40 38 0 0 1-80 0Z" fill="url(#${id}b)"/>
      <path class="u-cap" d="M15 21 35 4 55 21Z"/><path class="u-cap" d="M65 21 85 4 105 21Z"/>
      <g class="u-eye u-eye-l"><rect x="27" y="32" width="16" height="19" rx="2.5"/><path d="M35 32v19M27 41.5h16"/><circle class="u-pupil" cx="35" cy="43" r="3.4"/></g>
      <g class="u-eye u-eye-r"><rect x="77" y="32" width="16" height="19" rx="2.5"/><path d="M85 32v19M77 41.5h16"/><circle class="u-pupil" cx="85" cy="43" r="3.4"/></g>
      <path class="u-door" d="M53 108V93a7 7 0 0 1 14 0v15Z"/><circle class="u-knob" cx="63.5" cy="100" r="1.3"/>
    </g>
    <ellipse class="u-shadow" cx="60" cy="119" rx="34" ry="4"/>
  </svg></span>`;
}
export function setMood(el, mood) { if (el) el.dataset.mood = mood; }

// Eyes follow the pointer. One passive listener, one rAF per pointer move, only mascots on screen.
const live = new Set();
let px = -1, py = -1, raf = 0;
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target)))) : null;
function look() {
  raf = 0;
  live.forEach((el) => {
    const r = el.getBoundingClientRect();
    const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * 0.4);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
    el.style.setProperty('--px', ((dx / d) * 3.2 * k).toFixed(2) + 'px');
    el.style.setProperty('--py', ((dy / d) * 3.6 * k).toFixed(2) + 'px');
  });
}
export function watchEyes(root = document) {
  if (!io || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.u-mascot:not(.u-mini):not(.u-nav)').forEach((el) => io.observe(el));
  if (!watchEyes.on) {
    watchEyes.on = true;
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf && live.size) raf = requestAnimationFrame(look); }, { passive: true });
  }
}

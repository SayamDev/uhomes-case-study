// OKLCH helpers (after Vlad's Paper talk): interpolate in a perceptual space so a
// hue change doesn't drag lightness with it. Returns LINEAR sRGB for three.js.
export function oklchToLinear(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const cl = (x) => Math.min(1, Math.max(0, x));
  return [
    cl(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    cl(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    cl(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const lerp = (a, b, t) => a + (b - a) * t;
export function lerpHue(a, b, t) {
  let d = ((b - a + 540) % 360) - 180; // shortest way round
  return (a + d * t + 360) % 360;
}

// stops: [{ at: 0..1, L, C, h }]
// Blend in OKLab (a, b), not by rotating hue: going 55° → 240° round the wheel
// passes through magenta or green. Straight lines in a/b go through grey instead.
export function sampleStops(stops, t) {
  t = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1].at) i++;
  const A = stops[i], B = stops[i + 1];
  const k = (t - A.at) / (B.at - A.at || 1);
  const ab = (s) => [s.C * Math.cos((s.h * Math.PI) / 180), s.C * Math.sin((s.h * Math.PI) / 180)];
  const [a1, b1] = ab(A), [a2, b2] = ab(B);
  const a = lerp(a1, a2, k), b = lerp(b1, b2, k);
  return { L: lerp(A.L, B.L, k), C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

export const css = ({ L, C, h }) => `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)})`;

// 24h sky (Simmy Li's colour-stop clock, but stepped in OKLCH)
export const SKY = [
  { at: 0.0, L: 0.80, C: 0.07, h: 55 },   // dawn
  { at: 0.22, L: 0.87, C: 0.05, h: 240 }, // morning
  { at: 0.45, L: 0.90, C: 0.055, h: 232 },// noon
  { at: 0.66, L: 0.80, C: 0.11, h: 52 },  // golden hour
  { at: 0.82, L: 0.44, C: 0.10, h: 300 }, // dusk
  { at: 1.0, L: 0.22, C: 0.045, h: 268 }, // night
];

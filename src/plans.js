import { ensOf } from './data.js';
// Illustrative floor plans for each sample room type. Not to scale, not the real rooms.
// Drawn as architectural line work: walls, door swing, window, bed, desk, wardrobe, wet room, kitchenette.

const P = (d, cls = 'ln2 draw') => `<path class="${cls}" pathLength="1" d="${d}"/>`;
const R = (x, y, w, h, cls = 'fur', rx = 1.5) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;

function bed(x, y, w, h, rot = false) {
  // pillow at the top (or left when rotated)
  const pillow = rot ? R(x + 3, y + 4, 12, h - 8, 'fur', 3) : R(x + 4, y + 3, w - 8, 12, 'fur', 3);
  const duvet = rot ? `<rect class="duvet" x="${x + 18}" y="${y + 2}" width="${w - 20}" height="${h - 4}" rx="2"/>` : `<rect class="duvet" x="${x + 2}" y="${y + 18}" width="${w - 4}" height="${h - 20}" rx="2"/>`;
  const fold = rot ? P(`M${x + 26} ${y + 2} L${x + 26} ${y + h - 2}`, 'ln2 thin draw') : P(`M${x + 2} ${y + 26} L${x + w - 2} ${y + 26}`, 'ln2 thin draw');
  return `<g class="pop">${R(x, y, w, h, 'fur bed', 2)}${duvet}${pillow}${fold}</g>`;
}
function desk(x, y, w = 46, h = 20) {
  return `<g class="pop">${R(x, y, w, h)}<circle class="fur" cx="${x + w / 2}" cy="${y + h + 10}" r="7"/><circle class="ln2 thin" cx="${x + 9}" cy="${y + 8}" r="4" fill="none"/></g>
    <ellipse class="glow" cx="${x + 9}" cy="${y + 8}" rx="34" ry="26" fill="url(#lamp)"/>`;
}
function wardrobe(x, y, w = 38, h = 20) {
  return `<g class="pop">${R(x, y, w, h)}${P(`M${x} ${y} L${x + w} ${y + h} M${x + w} ${y} L${x} ${y + h}`, 'ln2 thin')}</g>`;
}
function wetroom(x, y, w, h, label = 'En suite') {
  const dim = `${(w / 40).toFixed(1)} × ${(h / 40).toFixed(1)} m`;
  const s = Math.min(30, w * 0.55);
  return `${R(x, y, w, h, 'wet', 0)}
    ${P(`M${x} ${y} H${x + w} V${y + h} H${x + 14} M${x} ${y + h} V${y}`)}
    <g class="pop">${R(x + 4, y + 4, s, s, 'fur', 1)}${P(`M${x + 4} ${y + 4} L${x + 4 + s} ${y + 4 + s}`, 'ln2 thin')}
    <ellipse class="fur" cx="${x + w - 11}" cy="${y + h * 0.52}" rx="6" ry="8"/>
    ${R(x + w - 18, y + 6, 14, 10, 'fur', 3)}</g>
    <text class="lbl" x="${x + 5}" y="${y + h - 14}">${label}</text><text class="lbl dim" x="${x + 5}" y="${y + h - 5}">${dim}</text>`;
}
// en suite at its real size (1 m = 40 units), in the corner by the door wall
let E = [52, 60];
const wet = (x, y, w, h, label) => wetroom(x + w - E[0] - 4, y + h - E[1] - 4, E[0], E[1], label);
function kitchen(x, y, w, h, vertical = true) {
  const hob = vertical ? `<circle class="ln2 thin" cx="${x + w / 2}" cy="${y + 14}" r="5" fill="none"/><circle class="ln2 thin" cx="${x + w / 2}" cy="${y + 28}" r="5" fill="none"/>${R(x + 4, y + h - 22, w - 8, 14, 'fur wet', 2)}`
    : `<circle class="ln2 thin" cx="${x + 14}" cy="${y + h / 2}" r="5" fill="none"/><circle class="ln2 thin" cx="${x + 28}" cy="${y + h / 2}" r="5" fill="none"/>${R(x + w - 24, y + 4, 16, h - 8, 'fur wet', 2)}`;
  return `<g class="pop">${R(x, y, w, h)}${hob}</g><text class="lbl" x="${x + (vertical ? -2 : 2)}" y="${y + h + 10}">Kitchenette</text>`;
}
function sofa(x, y, w = 50, h = 22) {
  return `<g class="pop">${R(x, y, w, h, 'fur', 5)}${R(x + 4, y + 4, w - 8, h - 9, 'fur bed', 3)}</g>`;
}
function shell(x, y, w, h) {
  // walls with a door gap bottom-left and a window on the top wall
  const door = 26;
  const walls = P(`M${x + door + 8} ${y + h} H${x + w} V${y} H${x} V${y + h} H${x + 8}`, 'w draw');
  const win = `${R(x + w * 0.3, y - 3, w * 0.4, 6, 'fur', 0)}${P(`M${x + w * 0.3} ${y} H${x + w * 0.7}`, 'ln2 thin draw')}`;
  const swing = P(`M${x + 8} ${y + h} A${door} ${door} 0 0 1 ${x + 8 + door} ${y + h - door}`, 'ln2 thin draw') + P(`M${x + 8} ${y + h} L${x + 8} ${y + h - door}`, 'ln2 draw');
  return walls + win + swing;
}

const LAYOUTS = {
  classic: (x, y, w, h) => shell(x, y, w, h) + wet(x, y, w, h) + bed(x + 6, y + 8, 36, 76) + desk(x + w - 50, y + 6) + wardrobe(x + w - 26, y + 44, 20, 38),
  premium: (x, y, w, h) => shell(x, y, w, h) + wet(x, y, w, h) + bed(x + 6, y + 8, 40, 80) + desk(x + w - 54, y + 6, 50) + wardrobe(x + w - 26, y + 44, 20, 40) + `<g class="pop"><circle class="fur" cx="${x + 30}" cy="${y + h * 0.72}" r="11"/></g>`,
  platinum: (x, y, w, h) => shell(x, y, w, h) + wet(x, y, w, h) + bed(x + 6, y + 8, 54, 78) + desk(x + w - 52, y + 6, 46) + wardrobe(x + w - 26, y + 46, 20, 42) + sofa(x + 8, y + h - 34, 44, 20),
  twodio: (x, y, w, h) => shell(x, y, w, h) + P(`M${x + w / 2} ${y} V${y + h * 0.42} M${x + w / 2} ${y + h * 0.62} V${y + h}`, 'w draw') + bed(x + 6, y + 8, 34, 72) + bed(x + w - 40, y + 8, 34, 72) + kitchen(x + w / 2 - 14, y + h * 0.44, 28, 24, false) + wetroom(x + w / 2 + 6, y + h - E[1] - 4, E[0], E[1], 'Shared') + `<text class="lbl" x="${x + 8}" y="${y + h - 8}">Room A</text><text class="lbl" x="${x + w - 40}" y="${y + 92}">Room B</text>`,
  studio: (x, y, w, h) => shell(x, y, w, h) + wet(x, y, w, h) + bed(x + 6, y + 8, 44, 78) + desk(x + w * 0.42, y + 6, 44) + kitchen(x + w - 26, y + 6, 22, 60),
  pstudio: (x, y, w, h) => shell(x, y, w, h) + wet(x, y, w, h) + bed(x + 6, y + 8, 54, 80) + desk(x + w * 0.46, y + 6, 42) + kitchen(x + w - 26, y + 6, 22, 66) + sofa(x + 8, y + h - 34, 54, 22),
};
const SIZE = { classic: [124, 156], premium: [134, 162], platinum: [148, 170], twodio: [168, 176], studio: [150, 172], pstudio: [162, 180] };
const ACCENT = { classic: '#c9d8e8', premium: '#e8d6c0', platinum: '#d8cce6', twodio: '#cfe3d4', studio: '#f0d3c9', pstudio: '#d4dde9' };

export function planSVG(type) {
  const L = type.layout || type.id;
  E = ensOf(type).map((m) => m * 40);
  // real size: 1 unit = 2.5 cm, so furniture is true to scale; big flats are scaled down to fit
  const [mw, md] = type.dims || [SIZE[L][0] / 40, SIZE[L][1] / 40];
  const w = mw * 40, h = md * 40;
  const k = Math.min(1, 168 / w, 178 / h);
  const ox = (200 - w * k) / 2, oy = 20;
  const bar = 40 * k;
  return `<svg viewBox="0 0 200 250" role="img" aria-label="Floor plan of a ${type.name}, ${type.size}, ${mw} by ${md} metres" style="--plan-accent:${ACCENT[L]}">
    <defs><radialGradient id="lamp"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
    <pattern id="grid-${type.id}" width="${10 * k}" height="${10 * k}" patternUnits="userSpaceOnUse"><path d="M${10 * k} 0H0V${10 * k}" fill="none" stroke="#232831" stroke-opacity=".05" stroke-width=".6"/></pattern></defs>
    <rect width="200" height="250" fill="url(#grid-${type.id})"/>
    <g transform="translate(${ox} ${oy}) scale(${k})">
      <rect x="0" y="0" width="${w}" height="${h}" fill="#fbf9f4"/>
      ${LAYOUTS[L](0, 0, w, h)}
    </g>
    <text class="area" x="${ox}" y="${oy + h * k + 28}">${type.size}</text>
    <g class="scalebar"><path class="ln2" d="M${ox + w * k - bar} ${oy + h * k + 12} h${bar} M${ox + w * k - bar} ${oy + h * k + 9} v6 M${ox + w * k} ${oy + h * k + 9} v6"/><text class="note" x="${ox + w * k - bar / 2}" y="${oy + h * k + 22}" text-anchor="middle">1 m</text></g>
    <text class="note" x="${ox + w * k}" y="${oy + h * k + 32}" text-anchor="end">${mw} × ${md} m, illustrative</text>
  </svg>`;
}

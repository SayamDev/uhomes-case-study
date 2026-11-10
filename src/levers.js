// Levers: filters that are also a conversation. Each shows what it costs you (−N rooms)
// and when results run thin we suggest the single change that brings rooms back.
import { countFits } from './fast.js';
import { TENANCIES, KIND_LABEL } from './data.js';

// Levers adapt to the building: its tenancies, room kinds and price range.
export function leversFor(b) {
  const kinds = [...new Set(b.types.map((t) => t.kind))];
  return [
    { key: 'budget', label: 'Budget', range: { min: b.budget[0], max: b.budget[1], step: 1 } },
    ...(b.tenancies.length > 1 ? [{ key: 'weeks', label: 'Tenancy', options: [[null, 'Any'], ...b.tenancies.map((w) => [w, TENANCIES[w].label])] }] : []),
    ...(kinds.length > 1 ? [{ key: 'kind', label: 'Room', options: [[null, 'Any'], ...kinds.map((k) => [k, KIND_LABEL[k]])] }] : []),
    ...(b.billsAll ? [] : [{ key: 'bills', label: 'Bills', options: [[null, 'Any'], [true, 'All included']] }]),
    { key: 'backing', label: 'Paying', options: [['g', 'With a guarantor'], ['nog', 'No guarantor'], ['full', 'In full']] },
  ];
}
let LEVERS = [];

const F = (value, extra = {}) => ({ value, quote: null, source: 'filter', ...extra });

export function leverValue(c, key) {
  if (key === 'backing') return c.payInFull ? 'full' : c.guarantor?.value === false ? 'nog' : c.guarantor ? 'g' : null;
  if (key === 'kind') return c.kind?.value ?? null;
  return c[key]?.value ?? null;
}

export function applyLever(c, key, v) {
  const n = { ...c };
  if (key === 'backing') {
    delete n.payInFull; delete n.guarantor;
    if (v === 'full') n.payInFull = F(true);
    else if (v === 'nog') n.guarantor = F(false);
    else if (v === 'g') n.guarantor = F(true);
    return n;
  }
  if (v === null || v === undefined) { delete n[key]; if (key === 'weeks' && n.start?.value === 'Jan') delete n.start; return n; }
  if (key === 'kind') n.kind = F(v, { label: KIND_LABEL[v] });
  else if (key === 'weeks') {
    n.weeks = F(v);
    if (v === 23) n.start = F('Jan', { label: 'January start' });
    else if (n.start?.value === 'Jan') n.start = F('Sep', { label: 'September start' });
  } else n[key] = F(v);
  return n;
}

const fits = (P, c) => countFits(P, c); // P: packed structure of arrays

// How many rooms does each lever, on its own, take away?
export function leverCosts(rooms, c, levers) {
  LEVERS = levers;
  const base = fits(rooms, c);
  const out = {};
  for (const L of LEVERS) {
    const v = leverValue(c, L.key);
    if (v === null || (L.key === 'backing' && v === 'g')) { out[L.key] = 0; continue; }
    const without = L.key === 'backing' ? applyLever(c, 'backing', 'g') : applyLever(c, L.key, null);
    out[L.key] = Math.max(0, fits(rooms, without) - base);
  }
  return { base, costs: out };
}

// The single change that brings most rooms back.
export function suggestions(rooms, c, max = 360) {
  const base = fits(rooms, c);
  const tries = [];
  if (c.budget) [10, 20, 35].forEach((d) => c.budget.value + d <= max && tries.push({ key: 'budget', v: c.budget.value + d, text: `Raise your budget to £${c.budget.value + d}/wk` }));
  if (c.maxWalk) tries.push({ key: 'maxWalk', v: c.maxWalk.value >= 20 ? null : c.maxWalk.value + 5, text: c.maxWalk.value >= 20 ? 'Any walking distance' : `Walk up to ${c.maxWalk.value + 5} min` });
  if (c.weeks) tries.push({ key: 'weeks', v: null, text: 'Any tenancy length' });
  if (c.start) tries.push({ key: 'start', v: null, text: 'Any start date' });
  if (c.kind) tries.push({ key: 'kind', v: null, text: 'Any room type' });
  if (c.bills) tries.push({ key: 'bills', v: null, text: 'Allow bills on top' });
  if (c.guarantor?.value === false) tries.push({ key: 'backing', v: 'full', text: 'Pay in full instead of instalments' });
  return tries
    .map((t) => ({ ...t, gain: fits(rooms, applyLever(c, t.key, t.v)) - base }))
    .filter((t) => t.gain > 0)
    .sort((a, b) => b.gain - a.gain || 0)
    .filter((t, i, arr) => arr.findIndex((x) => x.key === t.key) === i)
    .slice(0, 2);
}

export function renderLevers(root, c, { costs, base }, sugg, total, levers) {
  const html = levers.map((L) => {
    const v = leverValue(c, L.key);
    const cost = costs[L.key] ? `<span class="lev-cost" title="Rooms this filter rules out">−${costs[L.key]}</span>` : '';
    if (L.range) {
      const val = v ?? L.range.max;
      const val2 = v ?? L.range.max;
      return `<div class="lever lever-range"><div class="lev-top"><label for="lev-budget" class="lev-name">${L.label}</label>${cost}<output class="lev-out" for="lev-budget">${v ? `Up to £${v}/wk` : 'Any price'}</output></div>
        <input type="range" id="lev-budget" min="${L.range.min}" max="${L.range.max}" step="${L.range.step}" value="${val}" data-key="budget" style="--p:${((val - L.range.min) / (L.range.max - L.range.min)) * 100}%"></div>`;
    }
    const id = `lev-${L.key}`;
    return `<div class="lever" role="group" aria-labelledby="${id}"><div class="lev-top"><span class="lev-name" id="${id}">${L.label}</span>${cost}</div><div class="seg">${L.options
      .map(([ov, lab]) => `<button type="button" class="seg-b" data-key="${L.key}" data-v='${JSON.stringify(ov)}' aria-pressed="${String(ov) === String(v)}">${lab}</button>`)
      .join('')}</div></div>`;
  }).join('');
  const sug = sugg.length
    ? `<div class="sugg"><p class="sugg-k">${base === 0 ? 'Nothing fits every filter yet. One change brings rooms back:' : 'Want more choice? One change makes a difference:'}</p>${sugg
      .map((t) => `<button type="button" class="sugg-b" data-key="${t.key}" data-v='${JSON.stringify(t.v)}'>${t.text}<b>+${t.gain} ${t.gain === 1 ? 'room' : 'rooms'}</b></button>`)
      .join('')}</div>`
    : '';
  root.innerHTML = `<div class="lev-head"><p class="lev-count"><b>${base}</b> of ${total} rooms fit every filter</p></div><div class="lev-grid">${html}</div>${sug}`;
}

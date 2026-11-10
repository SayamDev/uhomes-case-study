// Deterministic fit rules. The AI reads the brief; it never decides fit or price.
// Every fact on a line comes from the uhomes listing (see data.js), never from the model.
import { TENANCIES, BUILDINGS, money } from './data.js';

const B = (room) => BUILDINGS[room.building];

// line: { status: 'fit'|'check'|'no', label, fact }
export function checkRoom(room, c) {
  const lines = [];
  const t = room.type, b = B(room), ten = TENANCIES[room.weeks];
  const total = room.total;
  let misses = 0;
  let unknown = 0;

  if (!room.book) { unknown++; lines.push({ status: 'check', label: 'Waitlist only right now', fact: 'uhomes shows “Join Waitlist” for this tenancy' }); }

  if (c.budget) {
    if (room.wk <= c.budget.value) lines.push({ status: 'fit', label: 'Within your budget', fact: `£${room.wk}/wk against your £${c.budget.value}/wk` });
    else { misses++; lines.push({ status: 'no', label: 'Over your budget', fact: `£${room.wk}/wk is £${room.wk - c.budget.value}/wk more than £${c.budget.value}/wk` }); }
  } else lines.push({ status: 'fit', label: 'No budget limit', fact: `This room is from £${room.wk}/wk on uhomes` });

  if (c.kind) {
    if (t.kind === c.kind.value) lines.push({ status: 'fit', label: `${c.kind.label}`, fact: `${t.name}, ${t.size}` });
    else { misses += 2; lines.push({ status: 'no', label: `Not ${/^[aeiou]/i.test(c.kind.label) ? 'an' : 'a'} ${c.kind.label.toLowerCase()}`, fact: `${t.name}, ${t.size}` }); }
  }

  if (c.weeks) {
    if (room.weeks === c.weeks.value) lines.push({ status: 'fit', label: `${room.weeks}-week tenancy`, fact: ten.dates });
    else { misses++; lines.push({ status: 'no', label: `${room.weeks} weeks, not ${c.weeks.value}`, fact: ten.dates }); }
  } else lines.push({ status: 'fit', label: `${room.weeks}-week tenancy`, fact: ten.dates });

  if (c.start) {
    if (room.start === c.start.value) lines.push({ status: 'fit', label: c.start.label, fact: ten.dates });
    else { misses++; lines.push({ status: 'no', label: `Starts ${ten.dates.split(' to ')[0]}`, fact: `Not a ${c.start.label.toLowerCase()}` }); }
  }

  if (c.bills) {
    if (room.bills) lines.push({ status: 'fit', label: 'Bills included', fact: b.bills });
    else { misses++; lines.push({ status: 'no', label: 'Not all bills included', fact: b.bills }); }
  }

  if (c.accessible) { unknown++; lines.push({ status: 'check', label: 'Accessible rooms not listed', fact: 'uhomes doesn’t list adapted rooms here. Ask the desk' }); }

  if (c.payInFull?.value) lines.push({ status: 'fit', label: 'Paying in full', fact: b.payInFull });
  else if (c.guarantor?.value === true) lines.push({ status: 'fit', label: 'Guarantor covered', fact: b.guarantor });
  else if (c.guarantor?.value === false) { unknown++; lines.push({ status: 'check', label: 'Instalments need a guarantor', fact: `Without one, uhomes lists paying in full. ${b.payInFull}` }); }
  else { unknown++; lines.push({ status: 'check', label: 'Guarantor not mentioned', fact: b.guarantor }); }

  if (c.loan?.value) {
    const plan = b.instalments && b.instalments.weeks === room.weeks ? b.instalments.plan : null;
    if (plan) lines.push({ status: 'fit', label: 'Instalments match loan terms', fact: plan.map(([d, w]) => `${d.replace(/ \d{4}$/, '')} (${w} wks)`).join(', ') });
    else lines.push({ status: 'check', label: 'Instalment dates not listed', fact: 'uhomes lists the plan for 44-week tenancies. Ask about this one' });
  }

  const uniMet = c.uni?.value === 'Manchester Met' && room.building === 'iq';
  if (uniMet) lines.push({ status: 'check', label: 'Manchester Met distance not listed', fact: `uhomes lists ${b.distance} to the ${b.campus}` });
  else if (c.maxWalk && b.walk > c.maxWalk.value) { misses++; lines.push({ status: 'no', label: `About ${b.walk} min to ${b.campus}`, fact: `${b.distance} on uhomes, longer than your ${c.maxWalk.value} min` }); }
  else lines.push({ status: 'fit', label: `${b.distance} to ${b.campus}`, fact: `About ${b.walk} min on foot (our estimate)` });

  let status = 'fit';
  if (misses === 1) status = 'nearly';
  if (misses > 1) status = 'no';
  if (misses === 0 && unknown > 0) status = 'check';
  if (misses === 1 && c.budget && room.wk > c.budget.value * 1.1) status = 'no';

  return { room, status, lines, total, totalLabel: money(total) };
}

export function checkAll(rooms, c) {
  return rooms.map((r) => checkRoom(r, c));
}

const rank = { fit: 0, check: 1, nearly: 2, no: 3 };
export function best(results) {
  return [...results].sort((a, b) => rank[a.status] - rank[b.status] || (b.room.book - a.room.book) || a.room.wk - b.room.wk)[0];
}

export const STATUS = {
  fit: { word: 'Fits', glyph: '✓' },
  nearly: { word: 'Nearly fits', glyph: '≈' },
  check: { word: 'Check first', glyph: '?' },
  no: { word: "Doesn't fit yet", glyph: '–' },
};

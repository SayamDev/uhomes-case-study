// SIMULATED "AI" understanding. Deterministic rules standing in for a model call.
// In production: an LLM returns this same structured shape, with source spans,
// validated against a schema. The fit decision stays in fit.js, never in the model.

const find = (re, s) => {
  const m = s.match(re);
  return m ? { m, quote: m[0].trim() } : null;
};

export function understand(text) {
  const s = ' ' + text.replace(/\s+/g, ' ') + ' ';
  const c = {};

  const month = find(/£\s?([\d,]{3,5})\s*(?:a|per|\/)\s*(?:month|mo|pcm)/i, s);
  const week = find(/£\s?(\d{2,3})(?:\s*(?:a|per|\/)\s*(?:week|wk|pw))?/i, s);
  if (month) {
    const m = Number(month.m[1].replace(/,/g, ''));
    c.budget = { value: Math.round((m * 12) / 52), quote: month.quote, inferred: true, note: `£${m.toLocaleString('en-GB')}/month is about` };
  } else if (week) {
    c.budget = { value: Number(week.m[1]), quote: week.quote, inferred: false };
  }

  const wk = find(/\b(\d{2})\s*weeks?\b/i, s) || find(/full (?:51 weeks|year)/i, s);
  const months = find(/\b12[- ]months?\b|\ba year\b/i, s);
  if (wk) {
    const n = wk.m[1] && /^\d+$/.test(wk.m[1]) ? Number(wk.m[1]) : 51;
    c.weeks = { value: n, quote: wk.quote };
  } else if (months) c.weeks = { value: 52, quote: months.quote };

  const jan = find(/\b(january|jan start|semester two|semester 2|second semester)\b/i, s);
  const sep = find(/\b(september|sept)\b/i, s);
  if (jan) c.start = { value: 'Jan', label: 'January start', quote: jan.quote };
  else if (sep) c.start = { value: 'Sep', label: 'September start', quote: sep.quote };

  const share = find(/\b(two[- ]bed(?:room)?|2[- ]bed(?:room)?|shared flat|flat ?share)\b/i, s);
  const apt = find(/\b(one[- ]bed(?:room)?|1[- ]bed(?:room)?|apartment|flat)\b/i, s);
  const studio = find(/\b(two-?dio|studio)\b/i, s);
  const ens = find(/\ben[\s-]?suite\b/i, s);
  if (share) c.kind = { value: 'share', label: 'Two-bed flat', quote: share.quote };
  else if (apt) c.kind = { value: 'apartment', label: 'One-bed flat', quote: apt.quote };
  else if (studio) c.kind = { value: 'studio', label: 'Studio', quote: studio.quote };
  else if (ens) c.kind = { value: 'ensuite', label: 'En suite', quote: ens.quote };

  const city = find(/\b(london|manchester)\b/i, s);
  if (city) c.city = { value: /london/i.test(city.quote) ? 'London' : 'Manchester', quote: city.quote };

  const walk = find(/(?:within|under|less than|max(?:imum)?)?\s*(\d{1,2})\s*min(?:ute)?s?(?:'s)?\s*(?:walk|from campus|from uni)/i, s);
  if (walk) c.maxWalk = { value: Number(walk.m[1]), quote: walk.quote };

  const bills = find(/\bbills (?:included|inclusive)\b|\ball[- ]inclusive\b/i, s);
  if (bills) c.bills = { value: true, quote: bills.quote };

  const acc = find(/\b(accessible|wheelchair|step-free|disabled access)\b/i, s);
  if (acc) c.accessible = { value: true, quote: acc.quote };

  const noG = find(/\b(no|without a?|don'?t have a?) guarantor\b/i, s);
  const yesG = find(/\b(mum|mom|dad|parent|parents|aunt|uncle|someone)\b[^.]{0,30}guarantor|guarantor[^.]{0,20}\b(mum|dad|parent)/i, s) ||
    find(/\b(mum|dad|parent)s? as (?:a |my )?guarantor\b/i, s);
  if (noG) c.guarantor = { value: false, quote: noG.quote };
  else if (yesG) c.guarantor = { value: true, quote: yesG.quote, inferred: true };

  const full = find(/pay (?:it )?in full|up ?front/i, s);
  if (full) c.payInFull = { value: true, quote: full.quote };

  const loan = find(/student (?:loan|finance)|maintenance loan|\bloan\b/i, s);
  if (loan) c.loan = { value: true, quote: loan.quote };

  const uni = find(/university of manchester|\buom\b|manchester met(?:ropolitan)?|\bmmu\b/i, s);
  if (uni) c.uni = { value: /met|mmu/i.test(uni.quote) ? 'Manchester Met' : 'University of Manchester', quote: uni.quote };

  return c;
}

// The reverse: write the brief back as a sentence from the criteria (filters → words).
export function briefFrom(c) {
  const parts = [];
  if (c.uni) parts.push(`Starting at ${c.uni.value === 'Manchester Met' ? 'Manchester Met' : 'the University of Manchester'}${c.start?.value === 'Jan' ? ' in January' : c.start?.value === 'Sep' ? ' in September' : ''}.`);
  else if (c.city?.value === 'London') parts.push('Moving to London for work.');
  else if (c.start) parts.push(`Starting in ${{ Jan: 'January', Sep: 'September', Nov: 'November', Aug: 'August' }[c.start.value]}.`);
  const room = [];
  if (c.kind) room.push({ studio: 'Studio', ensuite: 'En suite', apartment: 'One-bed flat', share: 'Two-bed flat' }[c.kind.value]);
  if (c.budget) room.push(`up to £${c.budget.value} a week`);
  if (c.weeks) room.push(`${c.weeks.value} weeks`);
  if (c.maxWalk) room.push(`within ${c.maxWalk.value} min walk`);
  if (c.bills) room.push('bills included');
  if (c.accessible) room.push('accessible room');
  if (room.length) { const r = room.join(', '); parts.push(r[0].toUpperCase() + r.slice(1) + '.'); }
  if (c.payInFull) parts.push("I'd rather pay in full up front.");
  else if (c.guarantor?.value === true) parts.push('My mum can be my guarantor.');
  else if (c.guarantor?.value === false) parts.push("I don't have a guarantor.");
  if (c.loan) parts.push("I'll pay from my student loan.");
  return parts.join(' ');
}

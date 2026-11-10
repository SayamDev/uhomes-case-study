import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@blossom-carousel/core/style.css';
import './style.css';
import { animate, inView, scroll, stagger } from 'motion';
import { BUILDINGS, COUNTRIES, SAMPLE_CITY, TENANCIES, KIND_LABEL, buildRooms, money, CAPTURED, REVIEWS, GALLERY } from './data.js';
import { packRooms, countFits } from './fast.js';
import { startTelemetry, mark } from './telemetry.js';
import { mascot, setMood, watchEyes } from './mascot.js';
import { understand, briefFrom } from './understand.js';
import { applyLever, leverCosts, suggestions, renderLevers, leversFor, leverValue } from './levers.js';
import { checkAll, best, STATUS } from './fit.js';
import { css as okcss } from './color.js';
import preset from './hero-preset.json';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
// Phones and tablets get lighter, quicker motion; desktop keeps its original choreography.
const compact = matchMedia('(max-width: 1180px), (hover: none), (pointer: coarse)').matches;
const D = (s) => (reduced ? 0 : s);
const EASE = [0.16, 1, 0.3, 1];
const EASE_IO = [0.76, 0, 0.24, 1];
const RENDER_MODE = new URLSearchParams(location.search).has('render');
const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();

// Current building: rooms are rebuilt and re-packed (structure of arrays) when you switch.
let BUILD = BUILDINGS.iq;
let ROOM_TYPES = BUILD.types;
let rooms = buildRooms(BUILD);
let PACK = packRooms(rooms, BUILD.walk);
let LEVERS = leversFor(BUILD);
const bMin = () => BUILD.budget[0], bMax = () => BUILD.budget[1], bSpan = () => BUILD.budget[1] - BUILD.budget[0];
let criteria = {};
let results = [];
let selected = null;
let hero = null;
let pinProgress = 0;
let lit = false;
let offerClaimed = false;
// The offer is the real uhomes promotion for the building (BUILD.offer). It is cashback, so totals never change.

// uhomes AI's mark: one lit window from the hero building. No face; it borrows the site's own language.
const AI_MARK = mascot({ size: 22, label: 'U, uhomes AI', cls: 'u-mini' });
const ICON = {
  fit: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="m6.8 10.2 2.2 2.2 4.2-4.6"/></svg>',
  check: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M8 8.1a2.1 2.1 0 1 1 3 1.9c-.7.4-1 .8-1 1.6M10 14.1v.1"/></svg>',
  no: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M7 10h6"/></svg>',
};
ICON.nearly = ICON.check;

/* =========================================================
   Rendering the check
   ========================================================= */
function renderChips(c) {
  const ul = $('#chips');
  if (blank()) { ul.innerHTML = ''; $('#und-help').hidden = true; $('#ur-n').textContent = '0'; return; }
  const items = [];
  // Where each value came from. Values set with the slider or filters have no words to quote, so say so.
  const src = (v) => !v.quote ? ({ filter: 'Set with the filters', slider: 'Set with the budget slider', link: 'From the shared link' }[v.source] || 'Set with the filters')
    : (v.inferred ? `Our reading of “${v.quote}”` : `From “${v.quote}”`);
  if (c.budget) items.push({ key: 'budget', k: 'Budget', v: `Up to £${c.budget.value}/wk`, s: c.budget.note && c.budget.quote ? `${c.budget.note} £${c.budget.value}/wk. From “${c.budget.quote}”` : src(c.budget), q: c.budget.quote });
  if (c.kind) items.push({ key: 'kind', k: 'Room', v: c.kind.label, s: src(c.kind), q: c.kind.quote });
  if (c.weeks) items.push({ key: 'weeks', k: 'Tenancy', v: `${c.weeks.value} weeks`, s: src(c.weeks), q: c.weeks.quote });
  if (c.start) items.push({ key: 'start', k: 'Start', v: c.start.label, s: src(c.start), q: c.start.quote });
  if (c.payInFull) items.push({ key: 'backing', k: 'Paying', v: 'In full, up front', s: src(c.payInFull), q: c.payInFull.quote });
  else if (c.guarantor) items.push({ key: 'backing', k: 'Guarantor', v: c.guarantor.value ? 'Has a UK guarantor' : 'No guarantor', s: src(c.guarantor), q: c.guarantor.quote });
  if (c.loan) items.push({ key: null, k: 'Paying with', v: 'Student loan', s: src(c.loan), q: c.loan.quote });
  if (c.uni) items.push({ key: null, k: 'Studying at', v: c.uni.value, s: src(c.uni), q: c.uni.quote });
  ul.innerHTML = items.map((i) => `<li><button type="button" class="u-chip" data-edit="${i.key || ''}" data-q="${(i.q || '').replace(/"/g, '&quot;')}" aria-label="${i.k}: ${i.v}. ${i.s}. Tap to change"><span class="u-k">${i.k}</span><span class="u-v">${i.v}</span><span class="u-s">${i.s}</span><span class="u-edit" aria-hidden="true">Change</span></button></li>`).join('') +
    (!c.budget ? `<li><button type="button" class="u-chip missing" data-edit="budget">${ICON.check}<span class="u-v">Add a budget, like “£250 a week”, so we can check prices.</span></button></li>` : '');
  animate(ul.children, { opacity: [0, 1], y: [8, 0], scale: [0.96, 1] }, { duration: D(0.4), delay: stagger(D(0.06)), ease: EASE });
  const n = results.filter((r) => r.status === 'fit').length;
  countTo($('#ur-n'), n);
  // Nothing fits: never leave a dead end. Offer the one change that brings rooms back.
  const help = $('#und-help');
  if (!n) {
    const sg = suggestions(PACK, criteria, bMax());
    help.hidden = false;
    help.innerHTML = `<p><b>No room fits all of that yet.</b> One change brings rooms back:</p>${sg.map((t) => `<button type="button" class="btn btn-secondary btn-sm" data-sugg="${t.key}" data-v='${JSON.stringify(t.v)}'>${t.text} <b>+${t.gain}</b></button>`).join('')}`;
  } else help.hidden = true;
}
function bindChips() {
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.u-chip'); if (!b) return;
    const need = $('#need'), q = b.dataset.q, at = q ? need.value.indexOf(q) : -1;
    if (at >= 0) { // show exactly which words it came from, ready to retype
      need.focus({ preventScroll: true }); need.setSelectionRange(at, at + q.length);
      need.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      toast('Those are the words U read. Type over them, then check again.');
    } else if (b.dataset.edit) { $('#lever-sheet').showModal(); setTimeout(() => $(`#levers [data-key="${b.dataset.edit}"], #levers #lev-${b.dataset.edit}`)?.focus(), 50); }
    else { need.focus(); }
    mark(`Chip: ${b.querySelector('.u-k')?.textContent || 'budget'}`);
  });
  $('#und-help').addEventListener('click', (e) => { const b = e.target.closest('[data-sugg]'); if (b) { setLever(b.dataset.sugg, JSON.parse(b.dataset.v)); syncHeroSlider(); } });
  $('#start-over').addEventListener('click', startOver);
}
// Start over: back to the example brief, every filter, sort, compare and saved-only view cleared.
function startOver() {
  const ex = $('#need').defaultValue;
  compare = []; renderTray(); view.sort = 'match'; view.saved = false;
  $('#rb-sort').value = 'match'; $('#rb-saved').setAttribute('aria-pressed', 'false');
  if (BUILD.id !== 'iq') setBuilding('iq');
  criteria = {}; $('#need').value = ex; commit({ first: true }); syncHeroSlider();
  go('#brief'); setTimeout(() => $('#need').focus({ preventScroll: true }), reduced ? 0 : 600);
  toast('Started over. Tell U what you need, or tap an example.'); mark('Start over');
}

function countTo(el, to) {
  const from = Number(el.textContent) || 0;
  animate(from, to, { duration: D(0.7), ease: 'easeOut', onUpdate: (v) => (el.textContent = Math.round(v)) });
}
function tallyCounts() {
  const n = { fit: 0, nearly: 0, check: 0, no: 0 };
  results.forEach((r) => n[r.status]++);
  return n;
}

// The mobile bar carries the best room for your brief.
function renderSelected() {
  const r = selected; if (!r) return;
  const t = r.room.type, s = STATUS[r.status];
  $('#mb-room').innerHTML = `<small>Best match</small> ${t.name}`;
  $('#mb-meta').textContent = `£${r.room.wk}/wk · ${money(r.total)} total · ${r.room.book ? s.word : 'Waitlist'}`;
}


function askDesk(label, r) {
  go('#support');
  const st = $('#ic-status');
  st.textContent = `U passed your question about the ${r.room.type.name} to the front desk: “${label}”${/[?.!]$/.test(label) ? '' : '.'} On the live site a real person replies here, with your brief already in front of them, so you won’t have to explain it twice.`;
  const chat = $('[data-buzz="chat"]');
  chat.classList.add('asked'); setTimeout(() => chat.classList.remove('asked'), 2400);
  $('#intercom').classList.add('buzzing'); setTimeout(() => $('#intercom').classList.remove('buzzing'), 1400);
}

/* ---------- Compare up to three ---------- */

/* ---------- Share a brief: the whole brief lives in a plain #hash ---------- */
function encodeBrief(c) {
  const p = [];
  if (c.budget) p.push('b' + c.budget.value);
  if (c.weeks) p.push('w' + c.weeks.value);
  if (c.kind) p.push('k' + c.kind.value[0]);
  if (c.maxWalk) p.push('m' + c.maxWalk.value);
  if (c.bills) p.push('bl');
  if (c.accessible) p.push('ac');
  if (c.payInFull) p.push('gf'); else if (c.guarantor) p.push(c.guarantor.value ? 'g1' : 'g0');
  if (c.loan) p.push('ln');
  if (c.start) p.push('s' + c.start.value[0].toLowerCase());
  if (c.uni) p.push(c.uni.value === 'Manchester Met' ? 'umm' : 'uom');
  if (BUILD.id === 'hlx') p.push('cl');
  return 'brief-' + p.join('-');
}
function decodeBrief(h) {
  if (!/^#brief-[a-z0-9-]*$/i.test(h)) return null;
  const c = {}; const F = (value, x = {}) => ({ value, quote: null, source: 'link', ...x });
  h.slice(7).split('-').forEach((t) => {
    if (/^b\d+$/.test(t)) c.budget = F(+t.slice(1));
    else if (/^w\d+$/.test(t)) c.weeks = F(+t.slice(1));
    else if (t === 'ke') c.kind = F('ensuite', { label: 'En suite' });
    else if (t === 'ks') c.kind = F('studio', { label: 'Studio' });
    else if (/^m\d+$/.test(t)) c.maxWalk = F(+t.slice(1));
    else if (t === 'bl') c.bills = F(true);
    else if (t === 'ac') c.accessible = F(true);
    else if (t === 'gf') c.payInFull = F(true);
    else if (t === 'g1') c.guarantor = F(true);
    else if (t === 'g0') c.guarantor = F(false);
    else if (t === 'ln') c.loan = F(true);
    else if (t === 'sj') c.start = F('Jan', { label: 'January start' });
    else if (t === 'ss') c.start = F('Sep', { label: 'September start' });
    else if (t === 'uom') c.uni = F('University of Manchester');
    else if (t === 'umm') c.uni = F('Manchester Met');
    else if (t === 'cl') c.city = F('London');
  });
  return c;
}
let hashReady = false;
function saveHash() { if (!hashReady) return; try { history.replaceState(null, '', '#' + encodeBrief(criteria)); } catch {} }
async function shareBrief() {
  hashReady = true; saveHash();
  try { await navigator.clipboard.writeText(location.href); toast('Link copied. Anyone who opens it sees this brief and these rooms.'); }
  catch { toast('Copy the address bar to share this brief.'); }
}

function claimOffer() {
  if (offerClaimed) { go('#rooms'); return; }
  offerClaimed = true; mark('Cashback added to checklist'); document.dispatchEvent(new Event('offer-claimed'));
  const o = $('#offer');
  o.classList.add('claimed');
  $('#offer-cta').textContent = 'on your list';
  $('#deal-bar').classList.add('claimed');
  $('#deal-bar .db-btn').textContent = 'On your list';
  animate(o, { scale: [1, 1.18, 1], rotate: [0, -14, 0] }, { duration: D(0.6), ease: EASE });
  renderSelected(); renderCarousel();
  if ($('#ready').open && readyRoom) renderReady(results.find((x) => x.room.id === readyRoom.room.id) || readyRoom);
  toast(`Added to your checklist: ${BUILD.offer.short.toLowerCase()} when you book through uhomes (${BUILD.offer.note}).`, 'See rooms', () => go('#rooms'));
}
function syncOffer() {
  const o = BUILD.offer; $('#offer-big').textContent = o.big; if (!offerClaimed) $('#offer-cta').textContent = o.small;
  $('#db-text').textContent = `${o.short} when you book through uhomes`;
  $('#offer-terms').textContent = `${o.short}, as listed by uhomes for ${BUILD.name} on ${CAPTURED}. Terms on uhomes.`;
  const bo = $('#budget-of'); if (bo) bo.textContent = rooms.length;
}
function bindClaims() { $$('[data-claim]').forEach((b) => (b.onclick = claimOffer)); }

function selectRoom(id) {
  const r = results.find((x) => x.room.id === id);
  if (!r) return;
  selected = r; renderSelected(true);
}


/* ---------- Step 3: ready to book ----------
   Everything the student needs before paying, built from their brief and this room's own check.
   Calm by design: one sentence summary, every "check first" comes with a next step, and a person is one tap away.
   The booking itself happens on uhomes.com: this hands off with nothing lost. */
let readyRoom = null;
function readyItems(r) {
  const c = criteria, L = (re) => r.lines.find((l) => re.test(l.label));
  const items = [];
  items.push({ status: 'fit', title: 'Photo ID', fact: 'Passport or driving licence.' });
  items.push({ status: 'fit', title: BUILD.id === 'iq' ? 'Proof you’re a student' : 'Proof of income or employment', fact: BUILD.id === 'iq' ? 'Your university offer email or student ID.' : 'A payslip or job offer letter is usual for apartments.' });
  if (c.payInFull?.value) items.push({ status: 'fit', title: 'Paying in full', fact: `${money(r.total)} total. uhomes lists: ${BUILD.payInFull}.` });
  else if (c.guarantor?.value === true) items.push({ status: 'fit', title: 'Guarantor details', fact: `${BUILD.guarantor} (uhomes). Have their name, email, phone and proof of address ready.` });
  else if (c.guarantor?.value === false) items.push({ status: 'check', title: 'No guarantor', fact: `uhomes lists paying in full as the option without one. Ask the desk if a guarantor service works here.`, ask: 'I don’t have a guarantor. What are my options?' });
  else items.push({ status: 'check', title: 'Guarantor or paying in full', fact: `Your brief didn’t say. ${BUILD.guarantor}; otherwise pay in full.`, ask: 'Do I need a guarantor for this room?' });
  const plan = BUILD.instalments && BUILD.instalments.weeks === r.room.weeks ? BUILD.instalments.plan : null;
  if (c.loan?.value) items.push(plan ? { status: 'fit', title: 'Student loan dates', fact: 'The 4 instalments line up with loan terms: see the payment plan above.' } : { status: 'check', title: 'Student loan dates', fact: 'uhomes doesn’t list the instalment plan for this tenancy.', ask: 'What are the instalment dates for this tenancy?' });
  const dates = L(/tenancy|weeks|Starts|start/i);
  if (dates && dates.status !== 'fit') items.push({ status: 'check', title: 'Dates', fact: dates.fact, ask: `Tenancy dates: ${dates.label}` });
  if (!r.room.book) items.push({ status: 'check', title: 'Waitlist', fact: 'uhomes shows “Join Waitlist” for this tenancy. Joining is free; you’re told when it opens.', ask: 'How long is the waitlist for this room?' });
  items.push({ status: 'fit', title: 'Before you pay', fact: `${BUILD.advance}, as listed on uhomes.` });
  return items;
}
// Complements uhomes: the consultation form and checkout are theirs; we hand over context so nothing is retyped.
function needsText(r) {
  const t = r.room.type;
  const qs = readyItems(r).filter((i) => i.ask).map((i, n) => `${n + 1}. ${i.ask}`);
  return [`Hi, I'm interested in ${t.name} at ${BUILD.name}, ${BUILD.city} (${r.room.weeks}-week tenancy, ${TENANCIES[r.room.weeks].dates}).`,
    `What I need: ${briefFrom(criteria)}`, qs.length ? `My questions:\n${qs.join('\n')}` : ''].filter(Boolean).join('\n\n');
}
function downloadIcs(r) {
  const d = TENANCIES[r.room.weeks]?.moveIn; if (!d) return;
  const t = r.room.type, stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//uhomes prototype//EN', 'BEGIN:VEVENT',
    `UID:${r.room.id}-${d}@uhomes-prototype`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:Move in: ${t.name}\, ${BUILD.name}`, `DESCRIPTION:Move-in date as listed on uhomes (${CAPTURED}). Confirm in your contract before you travel.`,
    `LOCATION:${BUILD.name}\, ${BUILD.city}`, 'BEGIN:VALARM', 'TRIGGER:-P14D', 'ACTION:DISPLAY', 'DESCRIPTION:Two weeks to move-in', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: 'move-in.ics' });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Move-in added as a calendar file, with a reminder two weeks before.');
}
function renderReady(r) {
  const t = r.room.type, ten = TENANCIES[r.room.weeks];
  const items = readyItems(r), checks = items.filter((i) => i.status !== 'fit');
  const total = r.total;
  const plan = BUILD.instalments && BUILD.instalments.weeks === r.room.weeks ? BUILD.instalments.plan : null;
  const fitsBrief = r.status === 'fit';
  const calm = !fitsBrief
    ? `This room doesn’t match everything in your brief yet. You can still book it, or ask the desk first.`
    : checks.length === 0 ? 'You’re ready to go.'
    : `You’re nearly there. ${checks.length === 1 ? 'One thing' : checks.length + ' things'} to check first, and the desk can answer ${checks.length === 1 ? 'it' : 'them'}.`;
  $('#ready-body').innerHTML = `
    <h2 class="ready-title" id="ready-title">${t.name}</h2>
    <p class="ready-sub">${BUILD.name}, ${BUILD.city} · ${t.size} · ${t.bed} · ${t.kitchen}</p>
    <p class="ready-calm">${mascot({ size: 48, mood: !fitsBrief || checks.length > 2 ? 'think' : 'happy', label: 'U', cls: 'u-ready' })}<span>${calm}</span></p>
    <section class="ready-block" aria-labelledby="rb-1"><h3 id="rb-1">Your booking, as listed on uhomes</h3>
      <dl class="ready-dl">
        <div><dt>Dates</dt><dd>${ten.dates}</dd></div>
        <div><dt>Rent</dt><dd>From £${r.room.wk}/wk${r.room.was > r.room.wk ? ` <s>£${r.room.was}</s>` : ''} · ${r.room.weeks} weeks</dd></div>
        <div><dt>Bills</dt><dd>${BUILD.bills}</dd></div>
        <div class="tot"><dt>Total listed</dt><dd>${money(total)}</dd></div>
        <div><dt>Availability</dt><dd>${r.room.book ? 'Book Now' : 'Join Waitlist'}</dd></div>
      </dl>
      ${plan ? `<h4 class="ready-h4">Payment plan with a guarantor</h4><ol class="pay-plan">${plan.map(([d, w]) => `<li><span>${d}</span><span>${w} weeks</span><b>≈ ${money(w * (total / r.room.weeks))}</b></li>`).join('')}</ol><p class="caption">Amounts are our estimate from the listed total; uhomes lists the dates and weeks. Or: ${BUILD.payInFull}.</p>` : `<p class="caption">${BUILD.payInFull}.</p>`}
      ${offerClaimed ? `<p class="ready-off">✓ ${BUILD.offer.short} on your checklist (${BUILD.offer.note})</p>` : `<button type="button" class="ready-offer" data-claim>${BUILD.offer.short} when you book through uhomes</button>`}
    </section>
    <section class="ready-block calm-block" aria-labelledby="rb-0"><h3 id="rb-0">If plans change</h3>
      <ul class="policy-list">${BUILD.policies.map(([h, p]) => `<li><b>${h}</b><span>${p}</span></li>`).join('')}</ul>
      <p class="caption">Summarised from the uhomes listing. Full terms are on uhomes.</p>
    </section>
    <section class="ready-block" aria-labelledby="rb-2"><h3 id="rb-2">What you’ll need</h3>
      <ul class="ready-list">${items.map((i) => `<li class="${i.status}">${ICON[i.status]}<div><p><b>${i.title}</b><span class="sr">${i.status === 'fit' ? ': have this ready' : ': check first'}</span></p><p class="rf">${i.fact}</p>${i.ask ? `<button type="button" class="ready-ask" data-q="${i.ask.replace(/"/g, '')}">Ask the desk</button>` : ''}</div></li>`).join('')}</ul>
    </section>
    <section class="ready-block" aria-labelledby="rb-3"><h3 id="rb-3">What happens next, on uhomes</h3>
      <ol class="next-steps">
        <li><b>uhomes opens ${BUILD.name}</b> in a new tab. If it offers a free consultation, say yes for help or close it to carry on.</li>
        <li><b>Find “${t.name}”</b> in the room list and pick the ${r.room.weeks}-week tenancy. <button type="button" class="ready-ask" id="copy-room">Copy the room name</button></li>
        <li><b>Book and pay</b> through uhomes’ checkout, with the things above to hand.</li>
        <li><b>Come back any time.</b> “Send to my guarantor” copies a link with your brief, so nothing is lost.</li>
      </ol>
    </section>
    <section class="ready-block" aria-labelledby="rb-4"><h3 id="rb-4">Take your brief with you</h3>
      <p class="rf">uhomes may offer a free consultation when the building opens. Paste this in so you don’t have to explain everything again.</p>
      <ul class="ready-qs">${items.filter((i) => i.ask).map((i) => `<li>${i.ask}</li>`).join('')}</ul>
      <div class="ready-row">
        <button type="button" class="btn btn-secondary" id="copy-needs">Copy my needs and questions</button>
        ${TENANCIES[r.room.weeks]?.moveIn ? '<button type="button" class="btn btn-secondary" id="ics">Add move-in to my calendar</button>' : ''}
      </div>
    </section>
    <section class="ready-block" aria-labelledby="rb-5"><h3 id="rb-5">Book in 3 steps on uhomes</h3>
      <ol class="three-steps">
        <li><b>Secure your place</b><span>Pick this room and tenancy on uhomes.</span></li>
        <li><b>Complete your application</b><span>Your details, ID and ${c0(r)}.</span></li>
        <li><b>Your booking is done</b><span>Sign the contract and pay ${BUILD.advance.toLowerCase().replace(/^advance rent of /, 'the £').replace('££', '£')}${/advance/i.test(BUILD.advance) ? ' advance rent' : ''}.</span></li>
      </ol>
      <p class="caption">uhomes’ own booking steps. Verified listing, Price-Match Guarantee and 1-on-1 support.</p>
    </section>
    <div class="ready-actions">
      ${r.room.book
        ? `<a class="btn btn-primary btn-wide" href="${BUILD.url}" target="_blank" rel="noopener" id="ready-go">Continue to book on uhomes<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13 13 7M8 7h5v5"/></svg></a>`
        : `<button type="button" class="btn btn-primary btn-wide" data-signup="waitlist">Tell me when it opens</button>
           <a class="btn btn-secondary btn-wide" href="${BUILD.url}" target="_blank" rel="noopener" id="ready-go">Join the waitlist on uhomes<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13 13 7M8 7h5v5"/></svg></a>`}
      <p class="ready-safe">🔒 No payment on this page. ${BUILD.policies[0][0]}${BUILD.policies[1] && /pay/.test(BUILD.policies[1][0]) ? ` and ${BUILD.policies[1][0].toLowerCase()}` : ''} on uhomes.</p>
      <div class="ready-row">
        <button type="button" class="btn btn-secondary" id="ready-desk">Ask the desk first</button>
        <button type="button" class="btn btn-secondary" id="ready-send">Send to my guarantor</button>
      </div>
      ${signedIn ? `<p class="ready-off">✓ Saved to your account (prototype)</p>` : `<button type="button" class="ready-save" data-signup="checklist">Save this checklist to my account</button>`}
      <p class="caption">Nothing is reserved until you book on uhomes. Prices and rules as listed on uhomes on ${CAPTURED}.</p>
    </div>`;
  bindClaims();
}
const c0 = (r) => (criteria.payInFull?.value ? 'payment in full' : 'your guarantor’s details');
function openReady(roomId) {
  const r = results.find((x) => x.room.id === roomId) || selected; if (!r) return;
  readyRoom = r; selected = r; renderSelected();
  renderReady(r);
  watchEyes($('#ready'));
  const d = $('#ready');
  if (!d.open) d.showModal();
  if (!reduced) animate('.ready-in', { x: [40, 0], opacity: [0, 1] }, { duration: 0.45, ease: EASE });
  $('#ready-x').focus();
  mark(`Ready to book: ${r.room.type.name}`);
}
// The film: made with raea from the same real listing. The hero thumbnail is a silent 8 s loop that only
// plays when it's on screen and motion is allowed; the 20 s film plays only when asked.
function bindFilm() {
  const loop = $('#watch-loop'), d = $('#film'), v = $('#film-v');
  if (loop && !reduced) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) { loop.preload = 'auto'; loop.play().catch(() => {}); } else loop.pause(); }, { threshold: 0.2 }).observe(loop);
  }
  $('#watch').addEventListener('click', () => { d.showModal(); v.currentTime = 0; v.play().catch(() => {}); loop?.pause(); mark('Film played'); });
  const close = () => { v.pause(); d.close(); };
  $('#film-x').addEventListener('click', close);
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  d.addEventListener('close', () => { v.pause(); if (!reduced) loop?.play().catch(() => {}); });
  v.addEventListener('ended', () => { d.close(); go('#brief'); toast('Now try it with your own brief.'); });
}
// Footer on phones: each link group opens on tap (a real button, so it works with keyboards and screen readers)
function bindFootAccordions() {
  $$('.foot-col').forEach((col, i) => {
    const p = col.querySelector(':scope > p'); if (!p) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fc-t'; b.textContent = p.textContent;
    b.setAttribute('aria-expanded', 'false'); p.replaceWith(b);
    const sync = () => { const phone = matchMedia('(max-width: 760px)').matches; b.tabIndex = phone ? 0 : -1; if (phone) b.setAttribute('aria-expanded', String(col.classList.contains('open'))); else b.removeAttribute('aria-expanded'); };
    sync(); matchMedia('(max-width: 760px)').addEventListener('change', sync);
    b.addEventListener('click', () => { const open = !col.classList.contains('open'); col.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); });
  });
}
function bindReady() {
  const d = $('#ready');
  $('#ready-x').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => {
    if (e.target === d) { d.close(); return; } // click on the backdrop
    const q = e.target.closest('.ready-ask');
    if (q) { d.close(); askDesk(q.dataset.q, readyRoom); return; }
    if (e.target.closest('#ready-desk')) { d.close(); const checks = readyItems(readyRoom).filter((i) => i.ask).map((i) => i.title.toLowerCase()); askDesk(`Before I book: ${checks.join(', ')}`, readyRoom); return; }
    if (e.target.closest('#ready-send')) { shareBrief(); return; }
    if (e.target.closest('#copy-room')) { navigator.clipboard?.writeText(readyRoom.room.type.name).then(() => toast(`Copied “${readyRoom.room.type.name}”. Paste it into the uhomes search if you need to.`)).catch(() => {}); return; }
    if (e.target.closest('#copy-needs')) { mark('Copied needs for consultation'); navigator.clipboard?.writeText(needsText(readyRoom)).then(() => toast('Copied. Paste it into the uhomes consultation form or chat.')).catch(() => toast('Copy didn’t work here. Try “Send to my guarantor” instead.')); return; }
    if (e.target.closest('#ics')) { downloadIcs(readyRoom); return; }
    if (e.target.closest('#ready-go')) { mark(`Continue to uhomes: ${readyRoom.room.type.name}`); navigator.clipboard?.writeText(readyRoom.room.type.name).catch(() => {}); }
  });
  $('#mb-ready').addEventListener('click', () => selected && openReady(selected.room.id));
}

/* ---------- Shortlist: hearts saved on this device only ---------- */
const SAVE_KEY = 'uhomes-proto-saved';
let saved = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch { return []; } })();
const isSaved = (typeId) => saved.includes(BUILD.id + ':' + typeId);
function toggleSave(typeId, btn) {
  const k = BUILD.id + ':' + typeId;
  saved = saved.includes(k) ? saved.filter((x) => x !== k) : [...saved, k];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch {}
  const on = saved.includes(k);
  btn.setAttribute('aria-pressed', String(on));
  if (on && !reduced) animate(btn, { scale: [1, 1.4, 1] }, { duration: 0.45, ease: EASE });
  renderSaved();
  if (on && saved.length >= 2 && !nudged && !signedIn) { nudged = true; setTimeout(() => askSignup('save'), 500); }
  else if (on) toast(`Saved. ${saved.length} on your shortlist, kept on this device.`, signedIn ? undefined : 'Keep it on all devices', signedIn ? undefined : () => askSignup('save'));
}
function renderSaved() { const n = saved.length; $('#nav-saved').hidden = !n; $('#saved-n').textContent = n; }

/* ---------- Sign up when it gives the student something, never as a wall ----------
   Asked at most once per visit on its own (after a second saved room), otherwise only when the student
   taps for something an account delivers: a waitlist alert, a saved checklist, a saved comparison. */
let signedIn = null, nudged = false;
const SIGNUP = {
  save: ['Keep your shortlist', 'Get an email if the price of a saved room drops or a waitlisted room opens. Your shortlist follows you to any device.'],
  waitlist: ['Get told when it opens', 'We’ll email you the moment this room opens on uhomes, so you don’t have to keep checking.'],
  checklist: ['Save your checklist', 'Pick up where you left off on any device, and share it with your guarantor.'],
  compare: ['Save this comparison', 'Keep these rooms side by side and come back to decide, alone or with a parent.'],
  nav: ['Save your brief and your shortlist', 'Come back on any device. Your guarantor can see the same rooms.'],
};
function setAuthMode(m) {
  const a = $('#auth'); a.dataset.mode = m;
  $('#pane-signup').hidden = m !== 'signup'; $('#pane-login').hidden = m !== 'login';
  $$('.auth-tabs [role=tab]').forEach((t) => { const on = t.dataset.modeTo === m; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  a.setAttribute('aria-labelledby', m === 'login' ? 'login-title' : 'auth-title');
  $('#auth-note').textContent = m === 'login'
    ? 'Prototype: no email is sent and nothing you type leaves this page. On uhomes.com this would sign you in.'
    : 'Prototype: no account is created and nothing you type is sent. On uhomes.com this would be the real sign-up.';
  $('#login-err').hidden = true; $('#login-email').removeAttribute('aria-invalid');
}
function askSignup(reason = 'nav', mode = 'signup') {
  if (signedIn) { toast(`Already saved to your account (prototype).`); return; }
  const [t, sub] = SIGNUP[reason] || SIGNUP.nav;
  $('#auth-title').textContent = t; $('#auth-sub').textContent = sub;
  setAuthMode(mode);
  $('#auth').dataset.reason = reason; $('#auth').showModal(); mark(`${mode === 'login' ? 'Log-in' : 'Sign-up'} opened: ${reason}`);
  if (mode === 'login') setTimeout(() => $('#login-email').focus(), 30);
}
function signupDone(how) {
  const login = $('#auth').dataset.mode === 'login';
  signedIn = how; $('#auth').close();
  $$('.nav-login, .nav-signup').forEach((b) => (b.hidden = true));
  $('#nav-me').hidden = false;
  toast(login ? (how === 'a sign-in link' ? 'Prototype: on uhomes.com a sign-in link would arrive by email now. Nothing was sent. Showing you as logged in.' : `Prototype: logged in with ${how}. Nothing was sent. Welcome back.`) : `Prototype: signed up with ${how}. Nothing was sent. Alerts and your shortlist would now follow you.`);
  if ($('#ready').open && readyRoom) renderReady(readyRoom);
  mark(`Signed up (${$('#auth').dataset.reason})`);
}

/* ---------- Reviews: real ones, including the downsides ---------- */
function reviewHTML(x) {
  return `<li class="rev"><p class="rev-stars" aria-label="${x.stars} out of 5">${'★'.repeat(x.stars)}${'☆'.repeat(5 - x.stars)}</p>
    <p class="rev-q">“${x.quote}”</p><p class="rev-g">${x.gist}</p>
    <p class="rev-who"><b>${x.who}</b> · ${x.uni}<br>${x.room} · ${x.weeks} weeks</p></li>`;
}
function renderReviews() {
  const box = $('#reviews'); if (!box) return;
  const R = REVIEWS[BUILD.id];
  $('#rev-sum').innerHTML = R.count ? `<b>${R.score}</b><span>★★★★★</span><span>${R.count} reviews on uhomes · ${R.label}</span>` : `<span>${R.label}. Ask the desk to arrange a viewing.</span>`;
  $('#rev-list').innerHTML = R.items.map(reviewHTML).join('');
  $('#rev-all').href = BUILD.url;
  $('#rev-all').hidden = !R.count;
}
function openReviews(typeId) {
  const items = REVIEWS[BUILD.id].items.filter((x) => x.type === typeId);
  const t = ROOM_TYPES.find((x) => x.id === typeId);
  $('#rv-title').textContent = `Students in the ${t.name}`;
  $('#rv-list').innerHTML = items.map(reviewHTML).join('');
  $('#rv').showModal(); mark(`Reviews: ${t.name}`);
}

/* ---------- Real photos for a few listings: step through on the card, open full screen ---------- */
function galGo(box, i) {
  const n = box.querySelectorAll('img').length; i = (i + n) % n; box.dataset.i = i;
  box.querySelector('.cg-track').style.transform = `translateX(${-100 * i}%)`;
  box.querySelector('.cg-n').textContent = `${i + 1} / ${n}`;
  box.querySelector('.cg-t').textContent = box.querySelectorAll('img')[i].alt;
  box.querySelectorAll('.cg-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
}
const galStep = (box, d) => galGo(box, +(box.dataset.i || 0) + d);
function bindGalleries() {
  // swipe on touch: horizontal moves page the photos, vertical moves still scroll the page
  let sx = 0, sy = 0, box = null, moved = false;
  const el = $('#carousel');
  el.addEventListener('pointerdown', (e) => { const b = e.target.closest('.c-gal'); if (!b || e.target.closest('button:not(.cg-open)')) return; box = b; sx = e.clientX; sy = e.clientY; moved = false; e.stopPropagation(); }, true);
  el.addEventListener('pointermove', (e) => { if (box && Math.abs(e.clientX - sx) > 8) moved = true; }, true);
  el.addEventListener('pointerup', (e) => {
    if (!box) return; const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { galStep(box, dx < 0 ? 1 : -1); box.dataset.swiped = '1'; setTimeout(() => delete box.dataset.swiped, 50); }
    box = null;
  }, true);
  el.addEventListener('click', (e) => { const b = e.target.closest('.c-gal'); if (b?.dataset.swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
  // lightbox
  const lb = $('#lb');
  $('#lb-x').addEventListener('click', () => lb.close());
  $('#lb-prev').addEventListener('click', () => lbGo(lbI - 1));
  $('#lb-next').addEventListener('click', () => lbGo(lbI + 1));
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') lbGo(lbI + 1); if (e.key === 'ArrowLeft') lbGo(lbI - 1); });
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  let lx = 0;
  $('#lb-img').addEventListener('pointerdown', (e) => { lx = e.clientX; });
  $('#lb-img').addEventListener('pointerup', (e) => { const dx = e.clientX - lx; if (Math.abs(dx) > 40) lbGo(lbI + (dx < 0 ? 1 : -1)); });
}
let lbSet = [], lbI = 0;
function lbGo(i) {
  const n = lbSet.length; lbI = (i + n) % n;
  const [src, cap] = lbSet[lbI];
  $('#lb-img').src = src; $('#lb-img').alt = cap;
  $('#lb-cap').textContent = cap; $('#lb-n').textContent = `${lbI + 1} / ${n}`;
}
function openLightbox(typeId, i = 0) {
  lbSet = GALLERY[typeId] || []; if (!lbSet.length) return;
  const t = ROOM_TYPES.find((x) => x.id === typeId);
  $('#lb-title').textContent = t ? t.name : 'Photos';
  lbGo(i); $('#lb').showModal(); mark(`Photos: ${t?.name}`);
}

/* ---------- Tiers: what actually differs between room types ----------
   uhomes reuses one photo across most tiers, so cards lead with the tier and the floor area instead,
   and each real photo appears once, in the room-type picker. */
const TIERS = ['silver', 'gold', 'platinum', 'diamond', 'penthouse'];
const tierOf = (t) => TIERS.find((x) => t.name.toLowerCase().startsWith(x)) || (t.kind === 'share' ? 'two' : 'one');
const tierLabel = (t) => { const k = tierOf(t); return TIERS.includes(k) ? `${k[0].toUpperCase() + k.slice(1)} tier` : KIND_LABEL[t.kind]; };
const maxM2 = () => Math.max(...ROOM_TYPES.map((t) => t.m2 || 0), 1);
function renderKinds() {
  const box = $('#kinds'); if (!box) return;
  const kinds = [...new Set(ROOM_TYPES.map((t) => t.kind))];
  const active = criteria.kind?.value || null;
  box.innerHTML = kinds.map((k) => {
    const ts = ROOM_TYPES.filter((t) => t.kind === k), photo = ts.find((t) => t.photo)?.photo;
    const from = Math.min(...rooms.filter((r) => r.type.kind === k).map((r) => r.wk));
    return `<button type="button" class="kind" data-kind="${k}" aria-pressed="${active === k}">
      ${photo ? `<img src="${photo}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <span class="kind-t"><b>${KIND_LABEL[k]}</b><span>${ts.length} type${ts.length === 1 ? '' : 's'} · from £${from}/wk</span></span>
      <span class="kind-c">Photo: uhomes</span></button>`;
  }).join('') + (active ? `<button type="button" class="kind kind-all" data-kind="">Show all room types</button>` : '');
}
function bindKinds() {
  $('#kinds').addEventListener('click', (e) => {
    const b = e.target.closest('[data-kind]'); if (!b) return;
    const k = b.dataset.kind || null;
    setLever('kind', criteria.kind?.value === k ? null : k);
    mark(`Room type: ${k || 'all'}`);
  });
}

/* ---------- Compare: up to 3 room types side by side ---------- */
let compare = [];
function toggleCompare(id) {
  if (compare.includes(id)) compare = compare.filter((x) => x !== id);
  else if (compare.length >= 3) { toast('You can compare up to 3 rooms. Remove one first.'); return; }
  else { compare = [...compare, id]; mark(`Compare + ${id}`); }
  renderTray(); renderCarousel();
  if ($('#cmp').open) compare.length > 1 ? renderCompare() : $('#cmp').close();
}
function renderTray() {
  const tray = $('#cmp-tray'); tray.hidden = !compare.length;
  document.body.classList.toggle('comparing', compare.length > 0);
  $('#cmp-picks').innerHTML = compare.map((id) => { const t = ROOM_TYPES.find((x) => x.id === id); return t ? `<li><span>${t.name}</span><button type="button" data-uncmp="${id}" aria-label="Remove ${t.name} from compare">×</button></li>` : ''; }).join('')
    + (compare.length < 3 ? `<li class="cmp-hint">${compare.length === 1 ? 'Pick one more to compare' : 'Add one more, or compare now'}</li>` : '');
  const btn = $('#cmp-open'); btn.disabled = compare.length < 2; btn.textContent = `Compare ${compare.length}`;
}
function topFor(typeId) { return best(results.filter((r) => r.room.type.id === typeId)); }
function renderCompare() {
  const cols = compare.map(topFor).filter(Boolean);
  const only = $('#cmp-diff').checked;
  const fitN = (r) => r.lines.filter((l) => l.status === 'fit').length;
  // [label, value(r), sortable number or null, better: 'low'|'high'|null]
  const rows = [
    ['Fits your brief', (r) => `<span class="badge ${r.room.book ? r.status : 'wait'}">${r.room.book ? STATUS[r.status].word : 'Waitlist'}</span>`, null, null],
    ['Matches', (r) => `${fitN(r)} of ${r.lines.length}`, fitN, 'high'],
    ['From', (r) => `<b>£${r.room.wk}</b>/wk`, (r) => r.room.wk, 'low'],
    ['Full price', (r) => (r.room.was > r.room.wk ? `<s>£${r.room.was}</s>/wk` : `£${r.room.was}/wk`), null, null],
    ['Total listed', (r) => money(r.total), (r) => r.total, 'low'],
    ['Tenancy', (r) => `${r.room.weeks} weeks<br><small>${TENANCIES[r.room.weeks].dates}</small>`, null, null],
    ['Size', (r) => r.room.type.size, (r) => r.room.type.m2 || null, 'high'],
    ['Bed', (r) => r.room.type.bed, null, null],
    ['Kitchen', (r) => r.room.type.kitchen, null, null],
    ['Bills', () => BUILD.bills, null, null],
    ['Availability', (r) => (r.room.book ? 'Book Now' : 'Join Waitlist'), null, null],
  ];
  const head = `<thead><tr><th scope="col"><span class="sr">Detail</span></th>${cols.map((r) => `<th scope="col"><span class="tier-chip tier-${tierOf(r.room.type)}">${tierLabel(r.room.type)}</span><b>${r.room.type.name}</b></th>`).join('')}</tr></thead>`;
  const body = rows.map(([label, val, num, better]) => {
    const vals = cols.map(val);
    if (only && new Set(vals).size === 1) return '';
    let bestI = -1;
    if (num && better) {
      const ns = cols.map(num); const ok = ns.filter((n) => n != null);
      if (ok.length > 1 && new Set(ok).size > 1) { const t = better === 'low' ? Math.min(...ok) : Math.max(...ok); bestI = ns.indexOf(t); }
    }
    return `<tr><th scope="row">${label}</th>${vals.map((v, i) => `<td${i === bestI ? ' class="best"' : ''}>${v}${i === bestI ? '<span class="sr"> (better)</span>' : ''}</td>`).join('')}</tr>`;
  }).join('');
  const foot = `<tfoot><tr><th scope="row"><span class="sr">Actions</span></th>${cols.map((r) => `<td><button type="button" class="btn btn-primary btn-sm" data-cmp-ready="${r.room.id}">${r.room.book ? 'Get ready to book' : 'Join waitlist'}</button><button type="button" class="cmp-rm" data-uncmp="${r.room.type.id}">Remove</button></td>`).join('')}</tr></tfoot>`;
  $('#cmp-t').innerHTML = head + `<tbody>${body}</tbody>` + foot;
}
function bindCompare() {
  const d = $('#cmp');
  $('#cmp-open').addEventListener('click', () => { if (compare.length < 2) return; renderCompare(); d.showModal(); mark(`Compared ${compare.length}`); });
  $('#cmp-clear').addEventListener('click', () => { compare = []; renderTray(); renderCarousel(); });
  $('#cmp-x').addEventListener('click', () => d.close());
  d.addEventListener('close', () => { if (!signedIn && compare.length > 1) toast('Want to come back to this comparison?', 'Save it', () => askSignup('compare')); }, { once: true });
  $('#cmp-diff').addEventListener('change', renderCompare);
  d.addEventListener('click', (e) => {
    if (e.target === d) { d.close(); return; }
    const r = e.target.closest('[data-cmp-ready]'); if (r) { d.close(); openReady(r.dataset.cmpReady); return; }
  });
  document.addEventListener('click', (e) => { const x = e.target.closest('[data-uncmp]'); if (x) toggleCompare(x.dataset.uncmp); });
  renderTray();
}

/* ---------- Live favicon: when you switch tabs, the icon carries your count ----------
   A small green badge with how many rooms fit, and a calm title. Shown only while the tab is hidden,
   so it's a gentle reminder to come back, never a flashing alert. */
const favImg = new Image(); favImg.src = './favicon.svg';
const baseTitle = document.title;
let favBase = null;
function liveFavicon() {
  const link = $('#fav'); if (!link) return;
  if (!favBase) favBase = link.href;
  const n = results.filter((r) => r.status === 'fit').length;
  if (!document.hidden || !n) { link.href = favBase; link.type = 'image/svg+xml'; document.title = baseTitle; return; }
  if (!favImg.complete) { favImg.onload = liveFavicon; return; }
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); x.drawImage(favImg, 0, 0, 64, 64);
  x.beginPath(); x.arc(46, 46, 17, 0, Math.PI * 2); x.fillStyle = '#0f9d58'; x.fill();
  x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.font = '800 22px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(n > 9 ? '9+' : String(n), 46, 47);
  link.type = 'image/png'; link.href = c.toDataURL('image/png');
  document.title = `${n} room${n === 1 ? '' : 's'} fit you · uhomes`;
}
document.addEventListener('visibilitychange', liveFavicon);

/* ---------- Results bar: count, active filters, sort, saved ---------- */
// Filters live next to the thing they change (proximity): every tap shows its effect on the same screen.
const view = { sort: 'match', saved: false };
function chipLabel(L, v) {
  if (L.range) return `Up to £${v}/wk`;
  const o = L.options.find(([ov]) => String(ov) === String(v));
  return o ? (L.key === 'bills' || L.key === 'accessible' ? o[1] : `${L.label}: ${o[1]}`) : null;
}
function activeLevers() {
  return LEVERS.map((L) => ({ L, v: leverValue(criteria, L.key) }))
    .filter(({ L, v }) => v !== null && v !== undefined && !(L.key === 'backing' && v === 'g'));
}
function renderRbar(shown) {
  const fit = results.filter((r) => r.status === 'fit').length;
  $('#rb-count').innerHTML = blank() ? `<b>${rooms.length}</b> rooms at ${BUILD.name}. <a href="#brief" class="rb-tell">Tell U what you need</a> to see which fit.` : `<b id="rb-n">${fit}</b> of <span id="rb-total">${rooms.length}</span> rooms fit your brief`;
  const act = activeLevers();
  const badge = $('#rb-active'); badge.hidden = !act.length; badge.textContent = act.length;
  $('#filters-open').setAttribute('aria-label', `Filters, ${act.length} active`);
  $('#rb-chips').innerHTML = act.map(({ L, v }) => `<li><button type="button" class="rb-chip" data-clear="${L.key}" aria-label="Remove filter: ${chipLabel(L, v)}">${chipLabel(L, v)}<span aria-hidden="true">×</span></button></li>`).join('')
    + (act.length > 1 ? '<li><button type="button" class="rb-chip rb-clear" data-clear="*">Clear all</button></li>' : '');
  const n = saved.filter((k) => k.startsWith(BUILD.id + ':')).length;
  $('#rb-sn').textContent = n ? ` ${n}` : '';
  // Saved only opens once there is something in it; the first heart makes it light up.
  const sb = $('#rb-saved');
  if (!n && view.saved) { view.saved = false; sb.setAttribute('aria-pressed', 'false'); queueMicrotask(renderCarousel); }
  const wasOff = sb.disabled; sb.disabled = !n;
  sb.title = n ? `Show your ${n} saved room${n > 1 ? 's' : ''}` : 'Tap the heart on a room to save it';
  sb.setAttribute('aria-label', n ? `Saved rooms, ${n}` : 'Saved rooms. Tap the heart on a room to save it first.');
  if (wasOff && n && !reduced) animate(sb, { scale: [1, 1.12, 1] }, { duration: 0.5, ease: EASE });
  const empty = $('#grid-empty');
  if (view.saved && !shown) {
    empty.hidden = false;
    empty.innerHTML = `<p><b>No saved rooms here yet.</b> Tap the heart on any room to keep it on your shortlist. It stays on this device.</p><button type="button" class="btn btn-secondary" data-empty="saved">Show all rooms</button>`;
  } else if (!fit && !blank()) {
    const sg = suggestions(PACK, criteria, bMax());
    empty.hidden = false;
    empty.innerHTML = `<p><b>Nothing fits every filter yet.</b> The rooms below are the closest. One change brings rooms back:</p>${sg.map((t) => `<button type="button" class="btn btn-secondary" data-sugg="${t.key}" data-v='${JSON.stringify(t.v)}'>${t.text} <b>+${t.gain}</b></button>`).join('')}`;
  } else empty.hidden = true;
}
function clearLevers() {
  let c = criteria;
  for (const { L } of activeLevers()) c = applyLever(c, L.key, L.key === 'backing' ? 'g' : null);
  criteria = c; $('#need').value = briefFrom(criteria); commit({ from: 'lever' }); syncHeroSlider();
}
function bindRbar() {
  $('#rb-sort').addEventListener('change', (e) => { view.sort = e.target.value; mark(`Sort: ${view.sort}`); renderCarousel(); });
  $('#rb-saved').addEventListener('click', (e) => {
    view.saved = !view.saved; e.currentTarget.setAttribute('aria-pressed', String(view.saved)); renderCarousel();
  });
  $('#rb-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    if (b.dataset.clear === '*') { clearLevers(); toast('Filters cleared. Every room is back in view.'); return; }
    const k = b.dataset.clear; setLever(k, k === 'backing' ? 'g' : null); if (k === 'budget') syncHeroSlider();
    ($('#rb-chips button') || $('#filters-open')).focus(); // keep focus in the bar, not lost on <body>
  });
  $('#grid-empty').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.empty === 'saved') { view.saved = false; $('#rb-saved').setAttribute('aria-pressed', 'false'); renderCarousel(); }
    if (b.dataset.sugg) setLever(b.dataset.sugg, JSON.parse(b.dataset.v));
  });
}

/* ---------- Room grid ---------- */
function renderCarousel() {
  const list = $('#carousel');
  const rankOf = (r) => ({ fit: 0, check: 1, nearly: 2, no: 3 })[r.status];
  const SORTS = {
    match: (a, b) => rankOf(a.top) - rankOf(b.top) || b.fits - a.fits || a.top.room.wk - b.top.room.wk,
    total: (a, b) => a.top.total - b.top.total,
    wk: (a, b) => a.top.room.wk - b.top.room.wk,
    size: (a, b) => b.t.m2 - a.t.m2 || a.top.room.wk - b.top.room.wk,
    book: (a, b) => (b.top.room.book - a.top.room.book) || rankOf(a.top) - rankOf(b.top) || a.top.room.wk - b.top.room.wk,
  };
  let order = [...ROOM_TYPES].map((t) => {
    const own = results.filter((r) => r.room.type.id === t.id);
    return { t, own, top: best(own), fits: own.filter((r) => r.status === 'fit').length };
  }).sort(blank() && view.sort === 'match' ? (a, b) => (b.top.room.book - a.top.room.book) || a.top.room.wk - b.top.room.wk : (SORTS[view.sort] || SORTS.match));
  if (criteria.kind) order = order.filter((o) => o.t.kind === criteria.kind.value); // the room-type picker narrows the cards
  if (view.saved) order = order.filter((o) => isSaved(o.t.id));
  renderRbar(order.length);
  list.innerHTML = order.map(({ t, own, top, fits }, i) => {
    const s = STATUS[top.status];
    // why: what the AI read from your brief, checked against this room. Problems first, max 4 lines.
    const why = [...top.lines].sort((x, y) => (x.status === 'fit') - (y.status === 'fit')).slice(0, 4);
    const total = top.total, R = top.room;
    const fitN = top.lines.filter((l) => l.status === 'fit').length, allN = top.lines.length;
    const first = why.find((l) => l.status !== 'fit');
    const badge = !R.book ? `<span class="badge wait">Waitlist</span>` : blank() ? `<span class="badge avail">Book now</span>` : `<span class="badge ${top.status}">${ICON[top.status]}${s.word}</span>`;
    const rv = (REVIEWS[BUILD.id]?.items || []).filter((x) => x.type === t.id);
    const gal = GALLERY[t.id];
    const head = `${badge}<button type="button" class="save" data-save="${t.id}" aria-pressed="${isSaved(t.id)}" aria-label="Save ${t.name} to your shortlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>`;
    const aiBlock = blank() ? `<a class="ai-check ai-blank" href="#brief">${AI_MARK}<span>Tell U what you need, and it checks this room for you</span></a>` : `<details class="ai-check">
        <summary>${AI_MARK}<span class="ac-meter" aria-hidden="true">${top.lines.map((l) => `<i class="${l.status}"></i>`).join('')}</span><span class="ac-txt"><b>${fitN}/${allN}</b> match your brief${first ? ` · <em>${first.label}</em>` : ''}</span></summary>
        <ul class="card-why" aria-label="How this room matches your brief">${why.map((l) => `<li class="${l.status}">${ICON[l.status]}<span><b>${l.label}</b> ${l.fact}</span></li>`).join('')}</ul>
        <button type="button" class="c-ask" data-ask-room="${R.id}">Ask the desk about this room</button>
      </details>`;
    const ten = TENANCIES[R.weeks];
    return `<li class="card t-${tierOf(t)}${gal ? ' has-gal' : ''}" data-type="${t.id}" aria-label="${t.name}, ${R.book ? s.word : 'waitlist'}">
      ${gal ? `<div class="c-gal" data-gal="${t.id}">
        <div class="cg-track">${gal.map(([src, cap], i) => `<img src="${src}" alt="${cap}" ${i ? 'loading="lazy"' : ''} decoding="async" referrerpolicy="no-referrer" draggable="false">`).join('')}</div>
        <button type="button" class="cg-open" data-gal-open="${t.id}" aria-label="Open ${gal.length} photos of ${t.name}"></button>
        <button type="button" class="cg-nav cg-prev" data-gal-step="-1" aria-label="Previous photo"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 5 7.5 10l5 5"/></svg></button>
        <button type="button" class="cg-nav cg-next" data-gal-step="1" aria-label="Next photo"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5 5 5-5 5"/></svg></button>
        <p class="cg-cap"><span class="cg-n">1 / ${gal.length}</span> <span class="cg-t">${gal[0][1]}</span></p>
        <span class="cg-dots" aria-hidden="true">${gal.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>
        <div class="c-head on-photo">${head}</div>
      </div>` : `<div class="c-head">${head}</div>`}
      <p class="c-tier"><i aria-hidden="true"></i>${tierLabel(t)} · ${KIND_LABEL[t.kind]}</p>
      <h3 class="card-title">${t.name}</h3>
      <p class="card-meta">${t.size} · ${t.bed} · ${t.kitchen}</p>
      ${rv.length ? `<button type="button" class="c-rev" data-reviews="${t.id}">★ ${(rv.reduce((a, x) => a + x.stars, 0) / rv.length).toFixed(1)} · ${rv.length} review${rv.length > 1 ? 's' : ''} from students in this room</button>` : ''}
      <div class="c-price">
        <p class="cp-main"><b>£${R.wk}</b><span>/wk</span>${R.was > R.wk ? `<s>£${R.was}</s>` : ''}</p>
        <p class="cp-sub"><b>${money(total)}</b> total · ${R.weeks} weeks from ${ten.dates.split(' to ')[0].replace(/^From /, '')}</p>
      </div>
      ${aiBlock}
      <div class="c-actions">
        <button type="button" class="btn btn-primary btn-sm card-go" data-ready="${R.id}">${R.book ? 'Get ready to book' : 'Join the waitlist'}</button>
        <button type="button" class="c-cmp" data-compare="${t.id}" aria-pressed="${compare.includes(t.id)}" aria-label="Compare ${t.name}"><span class="c-box" aria-hidden="true"></span>Compare</button>
      </div>
    </li>`;
  }).join('');
  bindClaims(); list.scrollLeft = 0; window.__rail?.();
  if (reduced) $$('.card', list).forEach((c) => c.classList.add('drawn'));
  else $$('.card', list).forEach((c, i) => inView(c, () => { setTimeout(() => c.classList.add('drawn'), i * 140); }, { amount: 0.35 }));
}

/* =========================================================
   Run a check
   ========================================================= */
let busy = false;
const BRIEF_KEY = 'uhomes-proto-brief'; // this device only; nothing leaves the browser
// One source of truth: criteria. Words, levers, the hero slider and the grid all write here.
// Blank until the student says something: no pre-filled brief, no pretend matches.
const blank = () => !Object.keys(criteria).some((k) => k !== 'city');
function commit({ first = false, from = 'brief' } = {}) {
  results = checkAll(rooms, criteria);
  document.body.classList.toggle('blank', blank());
  const keep = selected && results.find((r) => r.room.id === selected.room.id && r.status === 'fit');
  selected = keep || best(results);
  renderChips(criteria);
  renderSelected();
  renderCarousel();
  renderKinds(); growNeed();
  renderLeverPanel();
  lightHero();
  saveHash();
  if (typeof liveFavicon === 'function' && document.hidden) liveFavicon();
  if (!first) try { localStorage.setItem(BRIEF_KEY, JSON.stringify({ b: BUILD.id, t: $('#need').value })); } catch {}
  if (!first && from === 'brief' && !blank()) {
    const n = tallyCounts();
    toast(`${n.fit} rooms fit you${n.nearly ? `, ${n.nearly} nearly` : ''}.`, 'See the rooms', () => go('#rooms'));
  }
}
async function run(text, { first = false, from = 'brief' } = {}) {
  if (!first && from === 'brief' && !text.trim()) { toast('Tell U a little about what you need first, or tap an example.'); $('#need').focus(); return; }
  if (busy) return; busy = true;
  if (!first) mark(from === 'lever' ? 'Filter changed' : 'Brief read');
  const btn = $('#ask-go');
  btn.setAttribute('aria-busy', 'true');
  btn.querySelector('.btn-label').textContent = 'Reading what you wrote…';
  $('#understood').classList.add('loading');
  await new Promise((r) => setTimeout(r, first || reduced ? 0 : 700)); // simulated model latency
  try {
    criteria = understand(text);
    if (criteria.city) { const id = criteria.city.value === 'London' ? 'hlx' : 'iq'; if (setBuilding(id, { keepCriteria: true })) toast(`You mentioned ${criteria.city.value}, so we switched to ${BUILD.name}.`); }
    commit({ first, from });
  } catch (e) {
    console.error(e);
    toast("We couldn't read that just now. Your text is still there. Try again.");
  } finally {
    btn.removeAttribute('aria-busy');
    btn.querySelector('.btn-label').textContent = 'Check my rooms';
    $('#understood').classList.remove('loading');
    busy = false;
  }
}
// Filters → words: the sentence rewrites itself so the brief and the levers never disagree.
function setLever(key, v, { from = 'lever' } = {}) {
  criteria = applyLever(criteria, key, v);
  if (from === 'hero' && criteria.budget) criteria.budget = { ...criteria.budget, source: 'slider' };
  $('#need').value = briefFrom(criteria);
  animate('#need', { backgroundColor: ['#fff4f3', 'rgba(255,255,255,0)'] }, { duration: D(0.64) });
  commit({ from });
}

let levDrag = false;
function renderLeverPanel() {
  const root = $('#levers'); if (!root) return;
  if (levDrag && document.activeElement?.id === 'lev-budget') return;
  const t0 = performance.now();
  renderLevers(root, criteria, leverCosts(PACK, criteria, LEVERS), suggestions(PACK, criteria, bMax()), rooms.length, LEVERS);
  window.__leverMs = performance.now() - t0;
  const n = results.filter((r) => r.status === 'fit').length;
  $('#sheet-n').textContent = n; $('#sheet-done').setAttribute('aria-label', `Show ${n} rooms`);
}
function bindLevers() {
  const root = $('#levers');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]');
    if (!b || b.tagName === 'INPUT') return;
    const v = JSON.parse(b.dataset.v);
    setLever(b.dataset.key, v);
    if (b.classList.contains('sugg-b')) toast(`${b.textContent.replace(/\+.*/, '').trim()}. More rooms fit now.`);
  });
  // Dragging stays smooth: the slider is never rebuilt under your finger. The count updates as you go,
  // and the full filter (cards, brief, other filters' costs) applies a beat after you pause or let go.
  let t = 0;
  const apply = (el) => { clearTimeout(t); levDrag = false; const v = +el.value; setLever('budget', v >= bMax() ? null : v); syncHeroSlider(); };
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'lev-budget') return;
    levDrag = true;
    const v = +e.target.value;
    e.target.style.setProperty('--p', `${((v - bMin()) / bSpan()) * 100}%`);
    e.target.closest('.lever').querySelector('.lev-out').textContent = v >= bMax() ? 'Any price' : `Up to £${v}/wk`;
    $('#sheet-n').textContent = countFits(PACK, applyLever(criteria, 'budget', v >= bMax() ? null : v));
    clearTimeout(t); t = setTimeout(() => apply(e.target), 260);
  });
  root.addEventListener('change', (e) => { if (e.target.id === 'lev-budget') apply(e.target); });
  // Phones: the same levers in a bottom sheet
  const sheet = $('#lever-sheet');
  $('#filters-open').addEventListener('click', () => { sheet.showModal(); mark('Filters opened'); });
  $('#sheet-x').addEventListener('click', () => sheet.close());
  $('#sheet-done').addEventListener('click', () => sheet.close());
  $('#sheet-clear').addEventListener('click', () => clearLevers());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // tap the backdrop
  sheet.addEventListener('close', () => { $('#filters-open').focus({ preventScroll: true }); $('#rbar').scrollIntoView({ block: 'nearest' }); });
}

let toastTimer;
function toast(msg, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${msg}</span>` + (action ? `<button class="btn btn-primary" style="min-height:40px;padding:0 16px">${action}</button>` : '');
  t.hidden = false;
  if (action) t.querySelector('button').onclick = () => { t.hidden = true; fn(); };
  animate(t, { y: [30, 0], opacity: [0, 1] }, { duration: D(0.5), ease: EASE });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 6000);
}

function go(sel) { $(sel).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }

// the brief box grows with what you write, so nothing is hidden
const growNeed = () => { const t = $('#need'); t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
$('#need').addEventListener('input', growNeed); addEventListener('resize', growNeed); requestAnimationFrame(growNeed);
$('#ask').addEventListener('submit', (e) => { e.preventDefault(); run($('#need').value); });
$('#need').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run($('#need').value); } });
$$('[data-example]').forEach((b) => b.addEventListener('click', () => { $('#need').value = b.dataset.example; run(b.dataset.example); }));

/* =========================================================
   Hero shader
   ========================================================= */
async function initHero() {
  if (!hasGL) { document.documentElement.classList.add('no-gl'); return; }
  const { createHero } = await import('./hero-shader.js');
  const canvas = $('#hero-gl');
  hero = createHero(canvas, preset, {
    reducedMotion: reduced,
    getWordmarkBox: () => {
      const c = canvas.getBoundingClientRect(), w = $('#hero-word').getBoundingClientRect();
      return { x: w.left - c.left, y: w.top - c.top, width: w.width, height: w.height };
    },
  });
  await document.fonts.load('700 100px Poppins');
  hero.setReveal(0);
  hero.start();
  window.__hero = hero;
}




/* =========================================================
   Motion: loader, reveals, carousel physics, cursor
   ========================================================= */
const INTRO_KEY = 'uh-intro-v23';
let heroDone; const heroReady = new Promise((r) => (heroDone = r));
// Page entrance, shared by the first-visit intro and a plain refresh.
function heroIn(lead = 0) {
  // The 3D wordmark fades up when it is ready, whether that is now or a beat later.
  const reveal = () => animate(0, 1, { duration: D(lead ? 1.6 : 1.1), delay: D(lead), ease: [0.33, 1, 0.68, 1], onUpdate: (v) => hero.setReveal(v) });
  if (hero) reveal(); else heroReady.then(() => { if (hero) { hero.setReveal(0); lead = 0; reveal(); } });
  $$('.hero-title .ln > span').forEach((e) => (e.style.transform = 'translateY(110%)'));
  $$('.hero-cta > *, .hero-meta p, #nav, .offer, .offer-terms, .hero-sub').forEach((e) => (e.style.opacity = 0));
  document.documentElement.classList.remove('is-loading');
  animate('.hero-title .ln > span', { y: ['110%', '0%'] }, { duration: D(0.9), delay: stagger(D(0.07), { startDelay: D(lead + 0.1) }), ease: EASE });
  animate('.hero-sub, .hero-cta > *, .hero-meta p', { opacity: [0, 1], y: [16, 0] }, { duration: D(0.7), delay: stagger(D(0.05), { startDelay: D(lead + 0.25) }), ease: EASE });
  animate('#nav', { opacity: [0, 1] }, { duration: D(0.5), delay: D(lead * 0.5) });
  animate('.offer', { opacity: [0, 1], scale: [0.6, 1], rotate: [-40, -10] }, { type: 'spring', stiffness: 220, damping: 16, delay: D(lead + 0.6) });
  animate('.offer-terms', { opacity: [0, 1] }, { duration: D(0.5), delay: D(lead + 0.7) });
  if (!hasGL) $('#hero-word').style.visibility = 'visible';
}
async function quickStart(L, tasks) {
  // Wait for the hero to be drawable, but never more than a moment.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 350))]);
  $('.loader-row')?.remove(); $('#loader-canvas')?.remove();
  heroIn(0);
  await animate(L, { opacity: [1, 0] }, { duration: D(0.35), ease: 'easeOut' });
  L.classList.add('done');
}

async function loader(tasks) {
  const L = $('#loader'), count = $('#loader-count'), status = $('#loader-status');
  if (RENDER_MODE) { L.remove(); document.documentElement.classList.remove('is-loading'); return; }
  // The light-up intro plays once per browser (or on ?intro for a demo). A refresh goes straight to the page.
  let seen = false; try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch {}
  const wantIntro = /[?&]intro\b/.test(location.search);
  if ((seen && !wantIntro) || reduced) return quickStart(L, tasks);
  try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
  const cv = $('#loader-canvas');
  const dpr = Math.min(devicePixelRatio, 2), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  try { await document.fonts.load('700 100px Poppins'); } catch {}

  // 1. Wordmark mask
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mg = m.getContext('2d');
  mg.font = '700 100px Poppins';
  let size = (W * 0.84) / mg.measureText('uhomes').width * 100;
  size = Math.min(size, (H * 0.42) / 0.74);
  mg.font = `700 ${size}px Poppins`;
  const mm = mg.measureText('uhomes');
  const asc = mm.actualBoundingBoxAscent, desc = mm.actualBoundingBoxDescent;
  const x0 = (W - mm.width) / 2, base = H * 0.44 + asc / 2, top = base - asc;
  mg.fillStyle = '#fff'; mg.fillText('uhomes', x0, base);
  const px = mg.getImageData(0, 0, W, H).data;
  const inside = (x, y) => px[((y | 0) * W + (x | 0)) * 4] > 128;

  // 2. Windows: one per room, only where a whole window fits inside a letter
  const ch = Math.max(9, asc / 9), cw = ch * 0.82;
  const wins = [];
  for (let r = 0; top + r * ch < base + desc; r++) for (let c = 0; x0 + c * cw < x0 + mm.width; c++) {
    const x = x0 + c * cw, y = top + r * ch;
    if (inside(x + cw * 0.5, y + ch * 0.5) && inside(x + cw * 0.18, y + ch * 0.18) && inside(x + cw * 0.82, y + ch * 0.8)) {
      wins.push({ x: x + cw * 0.24, y: y + ch * 0.2, w: cw * 0.52, h: ch * 0.54, k: Math.random(), litAt: 0, warm: 0.82 + Math.random() * 0.12 });
    }
  }
  wins.sort((p1, p2) => p1.k - p2.k);
  const centre = wins.reduce((best, w) => (Math.hypot(w.x - W / 2, w.y - H * 0.44) < Math.hypot(best.x - W / 2, best.y - H * 0.44) ? w : best), wins[0]);

  // brick-tinted letters
  const tint = (col) => { const t = document.createElement('canvas'); t.width = W; t.height = H; const tg = t.getContext('2d'); tg.drawImage(m, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, W, H); return t; };
  const dim = tint('#3a1c21'), lit = tint('#c2393f');

  let shown = 0, found = false;
  function paint(p, now) {
    g.clearRect(0, 0, W, H);
    g.globalAlpha = 1; g.drawImage(dim, 0, 0);
    g.globalAlpha = Math.min(1, p * 1.1); g.drawImage(lit, 0, 0);
    g.globalAlpha = 1;
    const n = Math.floor(p * wins.length);
    for (let i = 0; i < wins.length; i++) {
      const w = wins[i];
      const on = i < n || (found && w === centre);
      if (on && !w.litAt) w.litAt = now;
      let a = on ? 1 : 0;
      if (on && now - w.litAt < 220) a = ((now - w.litAt) % 80) < 40 ? 0.35 : 1; // the flicker of a switch
      g.fillStyle = '#1b1215';
      g.fillRect(w.x, w.y, w.w, w.h);
      if (a > 0) {
        const fit = found && w === centre;
        g.globalAlpha = a;
        g.shadowBlur = fit ? 24 : 10;
        g.shadowColor = fit ? 'rgba(125,255,176,.9)' : 'rgba(255,196,110,.7)';
        g.fillStyle = fit ? '#7dffb0' : `hsl(38 100% ${Math.round(w.warm * 85)}%)`;
        g.fillRect(w.x, w.y, w.w, w.h);
        g.shadowBlur = 0; g.globalAlpha = 1;
      }
    }
  }

  const msgs = ['Switching on the lights', 'Reading the listings', 'Checking every tenancy', 'Found you a room'];
  let done = 0; const total = tasks.length;
  const minTime = reduced ? 0 : 1700, t0 = performance.now();
  tasks.forEach((p) => p.then(() => { done++; status.textContent = msgs[Math.min(done, msgs.length - 2)]; }).catch(() => done++));
  await new Promise((resolve) => {
    let prev = performance.now();
    (function tick() {
      const now = performance.now(), dt = Math.min(0.25, (now - prev) / 1000); prev = now;
      const time = Math.min(1, (now - t0) / (minTime || 1));
      const target = Math.min(done / total, time) * 100;
      shown += (target - shown) * (1 - Math.exp(-dt * 7)) + dt * 26;
      shown = Math.min(shown, target);
      count.textContent = Math.round(shown);
      paint(shown / 100, now);
      if (shown >= 99.5 && done >= total && time >= 1) { count.textContent = 100; resolve(); } else requestAnimationFrame(tick);
    })();
  });

  // 3. Your room lights up green, then we fly in through that window.
  found = true; status.textContent = msgs[3];
  const t1 = performance.now();
  await new Promise((r) => { (function hold() { const now = performance.now(); paint(1, now); if (now - t1 < (reduced ? 0 : 520)) requestAnimationFrame(hold); else r(); })(); });
  animate('.loader-row', { opacity: 0, y: 20 }, { duration: D(0.3) });
  // Settle, not zoom: the wordmark eases forward and the page fades up underneath it.
  cv.style.transformOrigin = '50% 44%';
  heroIn(0.35);
  const out = animate(L, { opacity: [1, 0] }, { duration: D(0.7), delay: D(0.15), ease: [0.33, 1, 0.68, 1] });
  animate(cv, { scale: [1, 1.08] }, { duration: D(0.85), ease: [0.33, 1, 0.68, 1] });
  await out;
  L.classList.add('done');
  if (!hasGL) $('#hero-word').style.visibility = 'visible';
}

function reveals() {
  if (reduced) return;
  // Headings open like window blinds
  $$('.huge-title').forEach((h) => {
    h.classList.add('blinds', 'shut');
    inView(h, () => { requestAnimationFrame(() => { h.classList.remove('shut'); h.classList.add('open'); }); }, { amount: 0.5 });
  });
  if (compact) {
    // Phones/tablets: only the cards on screen rise in, as whole cards, quickly. Cards further along are
    // already there when you swipe to them (no blank cards, no sideways slide fighting the swipe).
    inView('#carousel', (c) => {
      const vw = c.getBoundingClientRect().right;
      const onScreen = [...c.children].filter((li) => li.getBoundingClientRect().left < vw).slice(0, 4);
      animate(onScreen, { opacity: [0, 1], y: [16, 0] }, { duration: 0.3, delay: stagger(0.05), ease: [0.23, 1, 0.32, 1] });
    }, { amount: 0.15 });
  } else inView('#carousel', (c) => { animate($$('.card > *', c), { opacity: [0, 1], x: [120, 0] }, { duration: 1, delay: stagger(0.08), ease: EASE }); }, { amount: 0.15 });
  $$('.steps li').forEach((li) => inView(li, () => { animate(li, { opacity: [0, 1], y: [24, 0] }, { duration: 0.8, ease: EASE }); }, { amount: 0.6 }));


  // Footer wordmark letters rise in, then react to the pointer.
  const letters = $$('#foot-word span');
  inView('#foot-word', () => { animate(letters, { y: ['60%', '0%'], opacity: [0, 1] }, { duration: compact ? 0.6 : 1.2, delay: stagger(compact ? 0.04 : 0.06), ease: EASE }); }, { amount: 0.3 });
  $('#foot-word').addEventListener('pointermove', (e) => {
    letters.forEach((l) => {
      const r = l.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) / r.width;
      l.style.transform = `translateY(${-Math.max(0, 1 - d / 1.6) * 14}%)`;
    });
  });
  $('#foot-word').addEventListener('pointerleave', () => letters.forEach((l) => (l.style.transform = '')));
}

// Looping CSS animations (spinning stickers, LEDs, the ticker) pause whenever their section is off screen.
function pauseOffscreen() {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('anim-off', !e.isIntersecting)));
  $$('.hero, .support, .foot, .brief').forEach((el) => io.observe(el));
  if (!compact) return;
  // Phones/tablets: mascot blink/smoke loops only run while that mascot is on screen (battery, smoother scroll).
  const mo = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('loop-off', !e.isIntersecting)));
  const watch = () => $$('.u-mascot:not([data-watched])').forEach((m) => { m.dataset.watched = '1'; m.classList.add('loop-off'); mo.observe(m); });
  let q = 0; watch(); new MutationObserver(() => { cancelAnimationFrame(q); q = requestAnimationFrame(watch); }).observe(document.body, { childList: true, subtree: true });
}
function marquee() {
  const items = [['fit', '✓', 'Full cost, up front'], ['fit', '✓', 'Real people, 24/7'], ['fit', '✓', 'Verified listings'], ['fit', '✓', 'Price-Match Guarantee'], ['check', '•', 'Home starts with u']];
  const html = items.map(([k, g, t]) => `<span class="mq ${k}"><span class="g">${g}</span>${t}</span>`).join('');
  const track = $('#marquee');
  track.innerHTML = html + html + html + html;
  track.classList.add('run'); // CSS keyframes: runs on the compositor, and pauses when off screen
}

async function initCarousel() {
  const el = $('#carousel');
  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-gal-step],[data-gal-open]');
    if (g) { const box = g.closest('.c-gal'); if (g.dataset.galStep) galStep(box, +g.dataset.galStep); else openLightbox(box.dataset.gal, +(box.dataset.i || 0)); return; }
    const t = e.target.closest('[data-ask-room],[data-save],[data-ready],[data-compare],[data-reviews]'); if (!t) return;
    if (t.dataset.reviews) { openReviews(t.dataset.reviews); return; }
    if (t.dataset.ready) { openReady(t.dataset.ready); return; }
    if (t.dataset.compare) { toggleCompare(t.dataset.compare); return; }
    if (t.dataset.askRoom) { const r = results.find((x) => x.room.id === t.dataset.askRoom); const l = [...r.lines].find((x) => x.status !== 'fit'); askDesk(l ? l.label : 'Is this room still available?', r); }
    else { toggleSave(t.dataset.save, t); if (view.saved) renderCarousel(); else renderRbar(1); }
  });
  let blossom = null;
  if (fine) { const { Blossom } = await import('@blossom-carousel/core'); blossom = Blossom(el); blossom.init(); } // drag on desktop; touch scrolls natively
  const step = (dir) => {
    if (blossom) dir > 0 ? blossom.next({ align: 'start' }) : blossom.prev({ align: 'start' });
    else el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' && e.target === el) step(1); if (e.key === 'ArrowLeft' && e.target === el) step(-1); });
  // Progress: where you are in the set (people stop scrolling when they can't see the end)
  const bar = $('#rail-fill'), pos = $('#rail-pos');
  const progress = () => {
    const max = el.scrollWidth - el.clientWidth, n = el.children.length;
    const f = max > 0 ? el.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${Math.max(0.08, Math.min(1, (el.clientWidth / el.scrollWidth) + f * (1 - el.clientWidth / el.scrollWidth)))})`;
    const w = el.children[0]?.getBoundingClientRect().width || 1, vis = Math.max(1, Math.round(el.clientWidth / (w + 16)));
    const i = Math.min(n, Math.round(el.scrollLeft / (w + 16)) + vis);
    pos.textContent = n ? `${Math.min(i, n)} of ${n}` : '';
    $('#prev').disabled = el.scrollLeft < 4; $('#next').disabled = el.scrollLeft > max - 4;
  };
  window.__rail = progress;
  el.addEventListener('scroll', () => requestAnimationFrame(progress), { passive: true });
  addEventListener('resize', progress); progress();
  if (reduced) return;
  // Velocity skew + elastic overscroll: the cards feel like physical things you're flicking through
  let last = el.scrollLeft, skew = 0, over = 0, overT = 0;
  let raf = 0; const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
  el.addEventListener('overscroll', (e) => { e.preventDefault(); overT = e.detail.left; wake(); });
  el.addEventListener('scroll', wake, { passive: true });
  function loop() {
    const v = el.scrollLeft - last; last = el.scrollLeft;
    skew += (Math.max(-8, Math.min(8, v * -0.3)) - skew) * 0.12;
    over += (overT - over) * 0.25; overT *= 0.8;
    const cards = el.children, n = cards.length;
    for (let i = 0; i < n; i++) {
      const k = over > 0 ? (n - i) / n : (i + 1) / n;
      cards[i].style.transform = `skewX(${skew.toFixed(2)}deg) translateX(${(over * k * 0.6).toFixed(1)}px)`;
    }
    const busy = Math.abs(skew) > 0.02 || Math.abs(over) > 0.1 || Math.abs(overT) > 0.1 || v !== 0;
    raf = busy ? requestAnimationFrame(loop) : 0;
    if (!busy) for (let i = 0; i < n; i++) cards[i].style.transform = '';
  }
}

function cursor() {
  if (!fine || reduced) return;
  document.documentElement.classList.add('has-cursor');
  const c = $('#cursor'), label = $('#cursor-label');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    const t = e.target.closest('[data-cursor], a, button, .pg-cell, textarea');
    const lab = t?.closest('[data-cursor]')?.dataset.cursor;
    c.classList.toggle('is-label', !!lab && !t.matches('button:not([data-cursor]), a:not([data-cursor])'));
    c.classList.toggle('is-link', !!t && !c.classList.contains('is-label'));
    if (lab) label.textContent = lab;
  });
  // the loop sleeps once the dot has caught up, and wakes on the next pointer move
  let raf = 0;
  const loop = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0; };
  addEventListener('pointermove', () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
}

function mobileBar() {
  const bar = $('#mobile-bar');
  const deal = $('#deal-bar');
  // sticky bars show between the hero and the footer, never on top of the footer's links
  // The room bar only appears once you've actually seen your rooms (it names one, so it must have context).
  // The deal bar steps aside while the room cards are on screen (each card already shows the offer),
  // can be dismissed, and goes for good once claimed.
  let inHero = true, inFoot = false, inRooms = false, seenRooms = false, dealGone = false;
  const sync = () => {
    bar.classList.toggle('on', seenRooms && !inFoot && !inHero && !document.body.classList.contains('blank'));
    deal.classList.toggle('on', !dealGone && !offerClaimed && !inHero && !inFoot && !inRooms);
  };
  // thresholds 0 and 0.1: 'in the hero' means 10% or more of it is visible, and we still hear when it leaves entirely
  new IntersectionObserver(([e]) => { inHero = e.intersectionRatio >= 0.1; sync(); }, { threshold: [0, 0.1] }).observe($('.hero'));
  new IntersectionObserver(([e]) => { inFoot = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -30% 0px' }).observe($('.foot-grid'));
  new IntersectionObserver(([e]) => { inRooms = e.isIntersecting; if (inRooms) seenRooms = true; sync(); }, { rootMargin: '-20% 0px -20% 0px' }).observe($('#carousel'));
  $('#deal-x').addEventListener('click', () => { dealGone = true; sync(); });
  document.addEventListener('offer-claimed', sync);
}



/* ---------- v5: lived-in hero, lobby board, front desk, keyring ---------- */
// The hero is a control: your budget decides which windows are lit.
function roomForCell(ix, iy) { return rooms[Math.abs((ix * 73856093) ^ (iy * 19349663)) % rooms.length]; }
// The hero slider IS the budget lever. Windows light for rooms that fit your whole brief.
let resultById = new Map();
function lightHero() {
  resultById = new Map(results.map((r) => [r.room.id, r]));
  const isBlank = blank();
  // blank: windows light for rooms you can book now; with a brief: for rooms that fit it
  // a bookable room that only waits on an open question (e.g. guarantor not said yet) still lights
  const lit = (r) => !!r && (r.status === 'fit' || (r.status === 'check' && r.room.book && !criteria.accessible));
  hero?.light((ix, iy) => { const r = resultById.get(roomForCell(ix, iy).id); return isBlank ? !!r?.room.book : lit(r); }, true);
  const n = $('#budget-n'); if (!n) return;
  const c = isBlank ? rooms.filter((r) => r.book).length : results.filter(lit).length;
  if (+n.textContent !== c) countTo(n, c);
  $('#budget-tail').textContent = isBlank ? 'listings you can book now. Slide to set your budget.' : 'real listings fit your brief';
  $('#budget-of-w').hidden = isBlank;
  uReact(c);
  syncHeroSlider();
}
function syncHeroSlider() {
  const range = $('#budget-range'); if (!range || document.activeElement === range) return;
  range.min = bMin(); range.max = bMax();
  const b = criteria.budget?.value ?? bMax();
  range.value = Math.min(bMax(), Math.max(bMin(), Math.round(b)));
  paintHeroSlider();
}
function paintHeroSlider() {
  const range = $('#budget-range'), b = +range.value;
  $('#budget-out').textContent = b >= bMax() ? 'Any price' : `£${b}/wk`;
  range.style.setProperty('--p', `${((b - bMin()) / bSpan()) * 100}%`);
  $$('.budget-scale span').forEach((sp, i) => (sp.textContent = `£${BUILD.budget[i]}${i ? '+' : ''}`));
  range.setAttribute('aria-valuetext', `£${b} a week, ${$('#budget-n').textContent} rooms fit`);
}
function heroBudget() {
  const range = $('#budget-range');
  let raf = 0;
  let last = 0, t = 0;
  const apply = () => { last = performance.now(); setLever('budget', +range.value >= bMax() ? null : +range.value, { from: 'hero' }); };
  range.addEventListener('input', () => {
    paintHeroSlider();
    cancelAnimationFrame(raf); clearTimeout(t);
    // windows relight at most ~8 times a second while dragging, and once more when you stop
    if (performance.now() - last > 120) raf = requestAnimationFrame(apply); else t = setTimeout(apply, 140);
  });
  lightHero();
}
function carryBudgetToBrief() {}

/* ---------- Nav: the journey, the live count, and the essentials ---------- */
const LANGS = [['en', 'English', 'EN'], ['zh', '中文', '中文'], ['zh-HK', '繁體中文 (香港)', '繁'], ['zh-TW', '繁體中文 (台灣)', '繁'], ['vi', 'Tiếng Việt', 'VI'], ['th', 'ไทย', 'TH'], ['ja', '日本語', 'JA'], ['ko', '한국어', 'KO'], ['es', 'Español', 'ES'], ['de', 'Deutsch', 'DE'], ['fr', 'Français', 'FR'], ['it', 'Italiano', 'IT']];
function bindNav() {
  // which step you're on: the section nearest the top wins
  const steps = $$('[data-step]');
  const setStep = (k) => steps.forEach((a) => a.classList.toggle('on', a.dataset.step === k));
  const order = ['brief', 'rooms'];
  const vis = new Map();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => vis.set(e.target.id, e.isIntersecting));
    if ($('#ready').open) return;
    const cur = order.filter((id) => vis.get(id)).pop() || (scrollY < innerHeight * 0.5 ? null : null);
    setStep(cur);
  }, { rootMargin: '-45% 0px -45% 0px' });
  order.forEach((id) => io.observe($('#' + id)));
  $('#ready').addEventListener('close', () => setStep('rooms'));
  new MutationObserver(() => { if ($('#ready').open) setStep('ready'); }).observe($('#ready'), { attributes: true, attributeFilter: ['open'] });
  $('#nav-ready').addEventListener('click', (e) => { if (selected) { e.preventDefault(); openReady(selected.room.id); } });

  // languages: the same 12 uhomes offers
  const menu = $('#lang-menu'), btn = $('#lang-btn');
  menu.innerHTML = LANGS.map(([code, name, short]) => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${code === 'en'}" data-lang="${code}" data-short="${short}" lang="${code}">${name}</button></li>`).join('');
  const toggle = (open) => { menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('[aria-checked="true"]').focus(); };
  btn.addEventListener('click', () => toggle(menu.hidden));
  // Phones and tablets: the menu button opens its own sheet (the desktop dropdown lives in the hidden nav row)
  const dlg = $('#lang-dlg'), dl = $('#lang-dlg-list');
  dl.innerHTML = LANGS.map(([code, name, short]) => `<button type="button" role="radio" aria-checked="${code === 'en'}" data-lang="${code}" data-short="${short}" lang="${code}"><span>${name}</span></button>`).join('');
  $('#lang-btn-m').addEventListener('click', () => {
    $('#nav-sheet').hidden = true; $('#nav-menu').setAttribute('aria-expanded', 'false'); document.body.classList.remove('sheet-open');
    dlg.showModal(); dl.querySelector('[aria-checked="true"]').focus();
  });
  $('#lang-dlg-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => $('#nav-menu').focus({ preventScroll: true }));
  const pick = (b) => {
    const code = b.dataset.lang, full = LANGS.find((l) => l[0] === code);
    $$('[data-lang]').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.lang === code)));
    $('#lang-cur').textContent = full[2]; $('#lang-cur-m').textContent = full[1];
    if (code !== 'en') toast(`${full[1]}: on uhomes.com the whole site switches. This prototype is in English only.`);
    else toast('English selected.');
  };
  dl.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (!b) return; pick(b); dlg.close(); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]'); if (!b) return;
    pick(b); toggle(false); btn.focus();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { toggle(false); btn.focus(); } });
  addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.nav-lang')) toggle(false); });

  // sign up: framed around what the student gets, not around us
  const auth = $('#auth');
  $$('[data-auth]').forEach((b) => b.addEventListener('click', () => {
    $('#nav-sheet').hidden = true; $('#nav-menu').setAttribute('aria-expanded', 'false'); document.body.classList.remove('sheet-open');
    askSignup('nav', b.dataset.auth === 'login' ? 'login' : 'signup');
  }));
  auth.addEventListener('click', (e) => { const m = e.target.closest('[data-mode-to]'); if (m) { setAuthMode(m.dataset.modeTo); if (m.dataset.modeTo === 'login') $('#login-email').focus(); else $('#tab-signup').focus(); } });
  $('.auth-tabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const m = auth.dataset.mode === 'login' ? 'signup' : 'login'; setAuthMode(m); $('#tab-' + m).focus(); } });
  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const em = $('#login-email'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
    $('#login-err').hidden = ok; em.setAttribute('aria-invalid', String(!ok));
    if (!ok) { em.focus(); return; }
    signupDone('a sign-in link');
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-signup]'); if (b) askSignup(b.dataset.signup); });
  $('#auth-x').addEventListener('click', () => auth.close());
  auth.addEventListener('click', (e) => {
    if (e.target === auth) auth.close();
    const g = e.target.closest('[data-auth-go]');
    if (g) signupDone(g.dataset.authGo);
  });
  // phone menu
  const mb = $('#nav-menu'), sheet = $('#nav-sheet');
  const setSheet = (open) => { sheet.hidden = !open; mb.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('sheet-open', open); if (open && !reduced) animate(sheet, { opacity: [0, 1], y: [-12, 0] }, { duration: 0.28, ease: EASE }); };
  mb.addEventListener('click', () => setSheet(sheet.hidden));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setSheet(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { setSheet(false); mb.focus(); } });
  addEventListener('click', (e) => { if (!sheet.hidden && !e.target.closest('#nav-sheet') && !e.target.closest('#nav-menu')) setSheet(false); });
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) { sheet.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
}

/* ---------- U, the mascot: mounted once, reacts to how many rooms fit ---------- */
const U_SIZES = { nav: 30, hero: 64, brief: 34, auth: 72, foot: 96, desk: 40 };
function mountMascots() {
  $$('[data-mascot]').forEach((el) => { el.outerHTML = mascot({ size: U_SIZES[el.dataset.mascot] || 48, cls: 'u-' + el.dataset.mascot }); });
  watchEyes();
  // Tap U for a tip that's actually useful at this stage.
  const tips = [
    'Tip: tell me your course dates and I’ll match the tenancy length.',
    'Tip: student loans arrive each term, so I show every price per term too.',
    'Tip: a guarantor is usually a parent in the UK. No guarantor? You can often pay up front instead.',
    'Tip: tap the heart to save a room, then send the link to whoever’s helping you.',
  ];
  let ti = 0;
  const hu = $('.u-hero');
  if (hu) {
    hu.setAttribute('tabindex', '0'); hu.setAttribute('role', 'button'); hu.setAttribute('aria-label', 'U, tap for a tip');
    const tip = () => { $('#u-say').textContent = tips[ti++ % tips.length]; setMood(hu, 'happy'); if (!reduced) animate(hu, { y: [0, -12, 0], rotate: [0, -6, 0] }, { duration: 0.5, ease: EASE }); mark('Tapped U'); };
    hu.addEventListener('click', tip);
    hu.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tip(); } });
  }
}
let lastU = -1;
function uReact(n) {
  const say = $('#u-say'), u = $('.u-hero'), nav = $('#nav-fit-n');
  const isBlank = blank(), shown = isBlank ? rooms.length : n;
  if (nav && +nav.textContent !== shown) countTo(nav, shown);
  $('#nav-fit-l').textContent = isBlank ? 'rooms here' : (n === 1 ? 'room fits' : 'rooms fit');
  $('#nav-fit')?.classList.toggle('none', !isBlank && n === 0);
  $('#nav-fit')?.classList.toggle('neutral', isBlank);
  const nr = $('#ns-rooms'); if (nr) nr.textContent = isBlank ? `${rooms.length} rooms at ${BUILD.name}` : `${n} of ${rooms.length} fit your brief`;
  const key = isBlank ? -2 : n;
  if (!say || key === lastU) return;
  const first = lastU === -1; lastU = key;
  const total = rooms.length;
  const mood = isBlank ? 'calm' : n === 0 ? 'think' : n > total * 0.3 ? 'happy' : 'calm';
  setMood(u, mood);
  say.textContent = isBlank ? 'Hi, I’m U. Slide your budget, or tell me what you need, and I’ll light up the rooms that fit.'
    : n === 0 ? 'Nothing fits that yet. Try a little more budget, or tell me more below.'
    : n > total * 0.3 ? `${n} rooms light up. Plenty to choose from.`
    : `${n} rooms fit. A short list is a good list.`;
  if (!first && !reduced && u) animate(u, { y: [0, -8, 0] }, { duration: 0.45, ease: EASE });
}


function frontDesk() {
  const ic = $('#intercom'), status = $('#ic-status');
  const say = {
    call: 'Ringing the front desk… On the live site this calls +44 20 7631 5139.',
    whatsapp: 'Opening WhatsApp… In this prototype nothing is sent.',
    chat: 'A consultant would join this chat on the live site. Prototype only.',
    email: 'On the live site this opens an email to the support team. Prototype only.',
  };
  let t;
  $$('[data-buzz]', ic).forEach((b) => b.addEventListener('click', () => {
    b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 160);
    ic.classList.add('buzzing'); clearTimeout(t); t = setTimeout(() => ic.classList.remove('buzzing'), 1400);
    status.textContent = say[b.dataset.buzz];
    animate(status, { opacity: [0, 1], y: [6, 0] }, { duration: D(0.3) });
  }));
  const btn = $('#copy-ref'), refer = $('#refer');
  btn.addEventListener('click', async () => {
    refer.classList.add('given');
    try { await navigator.clipboard.writeText('https://en.uhomes.com/refer-to-earn'); btn.textContent = 'Link copied'; }
    catch { btn.textContent = 'en.uhomes.com/refer-to-earn'; }
    toast('Invite link ready. Your friend books, you get a £50 gift card.');
  });
}



/* ---------- Locations: switch the whole site to another building ---------- */
function setBuilding(id, { keepCriteria = false } = {}) {
  if (!BUILDINGS[id] || BUILD.id === id) return false;
  const old = BUILD;
  BUILD = BUILDINGS[id]; ROOM_TYPES = BUILD.types; compare = []; if ($('#cmp-tray')) renderTray();
  rooms = buildRooms(BUILD); PACK = packRooms(rooms, BUILD.walk); LEVERS = leversFor(BUILD);
  selected = null;
  if (!keepCriteria) {
    const c = { ...criteria };
    if (c.weeks && !BUILD.tenancies.includes(c.weeks.value)) delete c.weeks;
    if (c.start && BUILD.id === 'hlx') delete c.start;
    if (c.kind && !ROOM_TYPES.some((t) => t.kind === c.kind.value)) delete c.kind;
    if (BUILD.id === 'hlx') { delete c.uni; delete c.loan; }
    if (c.budget) { // keep the same place on the scale
      const k = (c.budget.value - old.budget[0]) / (old.budget[1] - old.budget[0]);
      c.budget = { ...c.budget, value: Math.round((BUILD.budget[0] + k * (BUILD.budget[1] - BUILD.budget[0])) / 5) * 5, quote: null, source: 'filter' };
    }
    c.city = { value: BUILD.city, quote: null, source: 'filter' };
    criteria = c;
    $('#need').value = briefFrom(criteria);
  }
  syncOffer(); growNeed();
  { const q = $('#city-q'); if (q && document.activeElement !== q) q.value = `${BUILD.name}, ${BUILD.city}`; }
  $$('[data-bname]').forEach((e) => (e.textContent = BUILD.name));
  $$('[data-bcity]').forEach((e) => (e.textContent = BUILD.city));
  $$('[data-building]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.building === BUILD.id)));
  return true;
}
// Countries and cities as on uhomes.com. Manchester and London open the sample buildings here;
// every other city is a real link to its uhomes.com page.
let country = 'uk';
const ALL_CITIES = COUNTRIES.flatMap((c) => c.cities.map((x) => ({ ...x, country: c.name, key: (x.name + ' ' + c.name).toLowerCase() })));
function cityHTML(c) {
  const b = SAMPLE_CITY[c.name] && BUILDINGS[SAMPLE_CITY[c.name]];
  if (b) return `<button type="button" class="city city-sample" data-building="${b.id}" aria-pressed="${BUILD.id === b.id}"><span class="cs-tag">Brief building</span><b>${c.name}</b><span>${b.name} · ${b.audience.toLowerCase()}</span></button>`;
  return `<a class="city" href="${c.url}" target="_blank" rel="noopener"><b>${c.name}</b><span>${c.country ? c.country + ' · ' : ''}on uhomes.com</span><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13 13 7M8 7h5v5"/></svg></a>`;
}
// One search field, like uhomes' own "City | University | Neighbourhood | Property" box.
// The two brief buildings (and the universities near them, with uhomes' distances) switch the rooms here;
// any other city opens its real uhomes page.
const PLACES = [
  { label: 'iQ Chandos House', sub: 'Manchester · 30 room types · student', b: 'iq', group: 'Rooms on this page' },
  { label: 'HL-Xavier Building', sub: 'London · 2 apartments · young professionals', b: 'hlx', group: 'Rooms on this page' },
  { label: 'University of Manchester', sub: '0.6 mi from iQ Chandos House', b: 'iq', group: 'Near your university' },
  { label: 'INTO Manchester', sub: '0.3 mi from iQ Chandos House', b: 'iq', group: 'Near your university' },
  { label: 'The Manchester College, Shena Simon', sub: '0.2 mi from iQ Chandos House', b: 'iq', group: 'Near your university' },
  { label: 'London College of Fashion, Olympic Park', sub: '0.2 mi from HL-Xavier Building', b: 'hlx', group: 'Near your university' },
  { label: 'UCL East', sub: '0.8 mi from HL-Xavier Building', b: 'hlx', group: 'Near your university' },
  { label: 'University of East London, Stratford', sub: '0.8 mi from HL-Xavier Building', b: 'hlx', group: 'Near your university' },
  ...ALL_CITIES.map((c) => SAMPLE_CITY[c.name]
    ? { label: c.name, sub: `${BUILDINGS[SAMPLE_CITY[c.name]].name} on this page`, b: SAMPLE_CITY[c.name], group: 'Cities' }
    : { label: c.name, sub: `${c.country} · opens on uhomes.com`, url: c.url, group: 'More cities on uhomes' }),
];
let comboItems = [], comboAt = -1;
function renderCombo(q = '') {
  const list = $('#city-list'); q = q.trim().toLowerCase();
  comboItems = q ? PLACES.filter((p) => (p.label + ' ' + p.sub).toLowerCase().includes(q)).slice(0, 9)
    : [...PLACES.filter((p) => p.group !== 'More cities on uhomes' && p.group !== 'Cities'), ...PLACES.filter((p) => p.url).slice(0, 4)];
  let last = '';
  list.innerHTML = comboItems.length ? comboItems.map((p, i) => {
    const head = p.group !== last ? `<li class="combo-g" role="presentation">${(last = p.group)}</li>` : '';
    return `${head}<li role="option" id="opt-${i}" class="combo-o${p.url ? ' ext' : ''}" data-i="${i}" aria-selected="${i === comboAt}"><b>${p.label}</b><span>${p.sub}</span></li>`;
  }).join('') : `<li class="combo-none" role="presentation">No match here. <a href="https://en.uhomes.com" target="_blank" rel="noopener">Search all of uhomes.com</a></li>`;
  list.hidden = false; $('#city-q').setAttribute('aria-expanded', 'true');
  $('#city-q').setAttribute('aria-activedescendant', comboAt >= 0 ? `opt-${comboAt}` : '');
}
function closeCombo() { $('#city-list').hidden = true; $('#city-q').setAttribute('aria-expanded', 'false'); comboAt = -1; }
function pickPlace(p) {
  closeCombo(); $('#city-q').blur();
  if (p.url) { window.open(p.url, '_blank', 'noopener'); mark(`Opened ${p.label} on uhomes`); $('#city-q').value = `${BUILD.name}, ${BUILD.city}`; return; }
  const changed = setBuilding(p.b);
  $('#city-q').value = p.b && !/House|Building/.test(p.label) && p.label !== BUILD.city ? `${p.label} → ${BUILD.name}` : `${BUILD.name}, ${BUILD.city}`;
  if (changed) { mark(`Switched to ${BUILD.city}`); commit({ from: 'lever' }); toast(`Showing ${BUILD.name}, ${BUILD.city}: ${rooms.length} listings from uhomes.`); }
}
function bindWhere() {
  const inp = $('#city-q'), list = $('#city-list');
  const openAll = () => { inp.select(); renderCombo(''); };
  inp.addEventListener('focus', openAll);
  inp.addEventListener('click', () => { if (list.hidden) openAll(); });
  $('#where').addEventListener('pointerup', (e) => { if (!e.target.closest('.combo-list,.combo-x') && document.activeElement !== inp) inp.focus(); });
  inp.addEventListener('input', () => { comboAt = -1; renderCombo(inp.value); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (list.hidden) renderCombo(inp.value);
      comboAt = Math.max(0, Math.min(comboItems.length - 1, comboAt + (e.key === 'ArrowDown' ? 1 : -1)));
      renderCombo(inp.value); $('#opt-' + comboAt)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && !list.hidden) { e.preventDefault(); const p = comboItems[Math.max(0, comboAt)]; if (p) pickPlace(p); }
    else if (e.key === 'Escape') { closeCombo(); inp.value = `${BUILD.name}, ${BUILD.city}`; }
  });
  list.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); pickPlace(comboItems[+o.dataset.i]); } });
  inp.addEventListener('blur', () => setTimeout(() => { if (!list.hidden) { closeCombo(); if (!inp.value.trim()) inp.value = `${BUILD.name}, ${BUILD.city}`; } }, 120));
  $('#combo-x').addEventListener('click', () => { inp.value = ''; inp.focus(); renderCombo(''); });
  // other buttons that switch building (e.g. footer)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-building]'); if (!b) return;
    if (setBuilding(b.dataset.building)) { mark(`Switched to ${BUILD.city}`); commit({ from: 'lever' }); toast(`Showing ${BUILD.name}, ${BUILD.city}: ${rooms.length} listings from uhomes.`); }
  });
  $('#change-where').addEventListener('click', (e) => { e.preventDefault(); go('#brief'); setTimeout(() => inp.focus({ preventScroll: true }), reduced ? 0 : 700); });
}

/* ---------- Live metrics: recorder runs from boot, the panel loads on demand ---------- */
const metricsCtx = {
  hero: () => hero, viewer: () => null, building: () => null,
  cv: () => !document.documentElement.classList.contains('no-cv'),
  glass: () => document.documentElement.classList.contains('glass-on'),
  setGlass: (on) => document.documentElement.classList.toggle('glass-on', on),
  setCV: (on) => document.documentElement.classList.toggle('no-cv', !on),
  // Same question, two layouts: how many rooms fit this brief?
  bench(size) {
    let list = rooms, pack = PACK;
    if (size) { list = Array.from({ length: size }, (_, i) => rooms[i % rooms.length]); pack = packRooms(list, BUILD.walk); }
    const c = criteria;
    // each side runs for about 250 ms (at least 3 runs), so the page never freezes for long
    const time = (fn) => { let k = 0, out; const t = performance.now(); do { out = fn(); k++; } while (performance.now() - t < 250 || k < 3); return { us: ((performance.now() - t) / k) * 1000, k, out }; };
    const A = time(() => checkAll(list, c).filter((r) => r.status === 'fit').length);
    const B = time(() => countFits(pack, c));
    return { objectUs: A.us, packedUs: B.us, rooms: list.length, fits: B.out, agree: A.out === B.out, iter: A.k + ' and ' + B.k };
  },
};
async function openMetricsPanel() { const m = await import('./metrics.js'); m.openMetrics(metricsCtx); }
function bindMetrics() {
  $$('[data-metrics]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openMetricsPanel(); }));
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
    openMetricsPanel();
  });
  if (new URLSearchParams(location.search).has('metrics')) openMetricsPanel();
}

/* =========================================================
   Boot
   ========================================================= */
(async function boot() {
  mountMascots();
  startTelemetry(() => ({ hero }));
  if (RENDER_MODE) document.documentElement.classList.add('render-mode');
  const fonts = document.fonts.ready;
  bindLevers();
  const shared = decodeBrief(location.hash); let welcome = null;
  if (shared && Object.keys(shared).length) { if (shared.city?.value === 'London') setBuilding('hlx', { keepCriteria: true }); criteria = shared; $('#need').value = briefFrom(shared); commit({ first: true }); hashReady = true; }
  else {
    await run($('#need').value, { first: true });
    // Welcome back: people decide over days (and with parents), so the brief should survive a closed tab.
    try { welcome = JSON.parse(localStorage.getItem(BRIEF_KEY)); } catch {}
    if (welcome?.t === $('#need').value) welcome = null;
  }
  const heroP = initHero(); heroP.then(heroDone, heroDone);
  heroP.then(() => hero && heroBudget());
  const minP = new Promise((r) => setTimeout(r, 300));
  reveals();
  marquee();
  await loader([fonts, heroP, minP]);
  if (welcome) setTimeout(() => toast('Welcome back. Pick up your last brief?', 'Pick up', () => {
    setBuilding(welcome.b, { keepCriteria: true }); $('#need').value = welcome.t; run(welcome.t); go('#brief');
  }), 1200);
  renderSaved();
  bindMetrics();
  bindReady(); bindFootAccordions(); bindFilm(); bindCompare(); syncOffer(); renderReviews();
  $('#rv-x').addEventListener('click', () => $('#rv').close()); $('#rv').addEventListener('click', (e) => { if (e.target === $('#rv')) $('#rv').close(); });
  bindNav();
  pauseOffscreen();
  initCarousel(); bindRbar(); bindKinds(); bindChips(); bindGalleries();
  cursor();
  mobileBar();
  frontDesk();
  bindWhere();
  $('#offer').addEventListener('click', claimOffer);
  $('#start-check').addEventListener('click', (e) => { e.preventDefault(); go('#brief'); setTimeout(() => $('#need').focus({ preventScroll: true }), reduced ? 0 : 900); });
  bindClaims();
})();

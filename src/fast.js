// Data-oriented fit counting (after Pim's talk on data-oriented design).
// Instead of building a receipt object per room for every "what if", we pack the rooms
// once into a structure of arrays: one typed array per property, the room is just an index.
// Strings become small numbers (enums) — the cloakroom-ticket idea. Counting the 48-brief grid
// and every lever's cost then touches a few hundred bytes, with zero allocation.
export const KIND = { ensuite: 0, studio: 1, apartment: 2, share: 3 };
export const START = { Sep: 0, Jan: 1, Nov: 2, Aug: 3 };

export function packRooms(rooms, walkExtra = 0) {
  const n = rooms.length;
  const P = {
    n,
    price: new Uint16Array(n), // £/wk
    weeks: new Uint8Array(n),
    kind: new Uint8Array(n),
    walk: new Uint8Array(n), // minutes
    bills: new Uint8Array(n),
    acc: new Uint8Array(n),
    start: new Uint8Array(n),
    book: new Uint8Array(n), // 1 = Book Now on uhomes, 0 = waitlist
    walkExtra,
  };
  for (let i = 0; i < n; i++) {
    const r = rooms[i];
    P.price[i] = r.wk; P.book[i] = r.book ? 1 : 0; P.weeks[i] = r.weeks; P.kind[i] = KIND[r.type.kind];
    P.walk[i] = walkExtra; /* building-level distance from uhomes */ P.bills[i] = r.bills ? 1 : 0; P.acc[i] = r.accessible ? 1 : 0; P.start[i] = START[r.start];
  }
  return P;
}

// Same rule as fit.js: a room "fits" when nothing is off and nothing needs checking.
export function countFits(P, c) {
  const backed = !!(c.payInFull?.value || c.guarantor?.value === true);
  if (!backed) return 0; // no guarantor and not paying in full → every room is "check first"
  if (c.accessible || c.uni?.value === 'Manchester Met') return 0; // not listed on uhomes → "check first"
  const budget = c.budget ? c.budget.value : 65535;
  const weeks = c.weeks ? c.weeks.value : 0;
  const kind = c.kind ? KIND[c.kind.value] : 255;
  const maxWalk = c.maxWalk ? c.maxWalk.value : 255;
  const extra = 0;
  const bills = c.bills ? 1 : 0, acc = c.accessible ? 1 : 0;
  const start = c.start ? START[c.start.value] : 255;
  const { price, weeks: W, kind: K, walk, bills: B, acc: A, start: S, book, n } = P;
  let fits = 0;
  for (let i = 0; i < n; i++) {
    if (!book[i]) continue;
    if (price[i] > budget) continue;
    if (weeks && W[i] !== weeks) continue;
    if (kind !== 255 && K[i] !== kind) continue;
    if (walk[i] + extra > maxWalk) continue;
    if (bills && !B[i]) continue;
    if (acc && !A[i]) continue;
    if (start !== 255 && S[i] !== start) continue;
    fits++;
  }
  return fits;
}

// REAL LISTINGS, copied from en.uhomes.com on 8 Nov 2026 (iQ Chandos House and HL-Xavier Building pages).
// Prices, sizes, tenancies, bookability, bills, instalments and policies are as uhomes showed them that day.
// They change: in production these come from the uhomes listings API, not a file.
export const CAPTURED = '8 Nov 2026';

// Tenancies by length, with uhomes' move-in and move-out dates. (No length is shared between the two buildings.)
export const TENANCIES = {
  51: { weeks: 51, start: 'Sep', label: '51 weeks', dates: '11 Sep 2027 to 2 Sep 2028', moveIn: '20270911' },
  44: { weeks: 44, start: 'Sep', label: '44 weeks', dates: '11 Sep 2027 to 15 Jul 2028', moveIn: '20270911' },
  43: { weeks: 43, start: 'Nov', label: '43 weeks (2026/27)', dates: '7 Nov 2026 to 4 Sep 2027', moveIn: '20261107' },
  36: { weeks: 36, start: 'Nov', label: '36 weeks (2026/27)', dates: '7 Nov 2026 to 17 Jul 2027', moveIn: '20261107' },
  35: { weeks: 35, start: 'Jan', label: '35 weeks, January start', dates: '2 Jan 2027 to 4 Sep 2027', moveIn: '20270102' },
  55: { weeks: 55, start: 'Aug', label: '55 weeks', dates: '10 Aug 2026 to 31 Aug 2027', moveIn: '20260810' },
  52: { weeks: 52, start: 'Sep', label: '52 weeks', dates: 'From 1 Sep 2026, move-out flexible', moveIn: '20260901' },
};

export const KIND_LABEL = { ensuite: 'En suite', studio: 'Studio', apartment: 'One-bed flat', share: 'Two-bed flat' };

// ten: [weeks, price now £/wk, full price £/wk, total listed on uhomes, 1 = Book Now / 0 = Join Waitlist]
export const BUILDINGS = {
  iq: {
    id: 'iq', city: 'Manchester', name: 'iQ Chandos House', address: '11 Granby Row, Manchester M1 3BT',
    url: 'https://en.uhomes.com/uk/manchester/detail-apartments-1711854', sector: 'Student accommodation', audience: 'Students',
    campus: 'University of Manchester', distance: '0.6 mi', walk: 12, // uhomes lists 0.6 mi; minutes are our estimate at 3 mph
    nearby: 'INTO Manchester 0.3 mi · The Manchester College 0.2 mi',
    budget: [240, 400], tenancies: [44, 51, 43, 36, 35],
    billsAll: true, bills: 'Water, electricity, internet and contents insurance included',
    advance: 'Advance rent of £225',
    guarantor: 'Local or international guarantor accepted for instalments',
    instalments: { weeks: 44, plan: [['1 Aug 2027', 5], ['20 Sep 2027', 16], ['10 Jan 2028', 16], ['10 Apr 2028', 7]] },
    payInFull: 'Pay in full by 1 Aug 2027',
    policies: [
      ['No visa, no pay', 'If your UK visa is refused, you can cancel and get your rent back (send proof within 72 hours).'],
      ['No place, no pay', 'Missed the grades for your first-choice university? Cancel and get your rent back (within 72 hours of results).'],
    ],
    offer: { amt: 500, big: '£500', small: 'cashback, up to', short: 'Up to £500 cashback', note: 'uhomes offer, T&Cs on uhomes' },
    rating: '4.9 from 12 reviews',
    types: [{"id": "gold-en-suite", "name": "Gold En Suite", "kind": "ensuite", "size": "13–13.5 m²", "m2": 13.25, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1395/01KC9JAHP4HTFKD54GTWM2A56T_z.webp", "ten": [[51, 249, 256, 13056, 1], [44, 267, 276, 12144, 1], [43, 241, 261, 11223, 0]]}, {"id": "platinum-en-suite", "name": "Platinum En Suite", "kind": "ensuite", "size": "13–13.5 m²", "m2": 13.25, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1399/01K9A7QZMQWGTWD2PHNF6N373C_z.webp", "ten": [[51, 261, 268, 13668, 1], [44, 280, 289, 12716, 1], [43, 251, 271, 11653, 0]]}, {"id": "diamond-en-suite", "name": "Diamond En Suite", "kind": "ensuite", "size": "13–13.5 m²", "m2": 13.25, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9CSV7Y12B72STSN52JEA935_z.webp", "ten": [[51, 272, 279, 14229, 1], [44, 292, 301, 13244, 1], [43, 263, 283, 12169, 0]]}, {"id": "diamond-en-suite-deluxe", "name": "Diamond En Suite Deluxe", "kind": "ensuite", "size": "13–14 m²", "m2": 13.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1399/01K9FBT44VVE3B9T3GX2PNZ0XC_z.webp", "ten": [[51, 283, 290, 14790, 1], [44, 304, 313, 13772, 1], [43, 266, 286, 12298, 0]]}, {"id": "penthouse-en-suite", "name": "Penthouse En Suite", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1389/01KBZ65GG9E381BZSS6199BBNR_z.webp", "ten": [[51, 285, 292, 14892, 1], [44, 306, 315, 13860, 1], [43, 273, 293, 12599, 0]]}, {"id": "diamond-en-suite-deluxe-plus", "name": "Diamond En Suite Deluxe Plus", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9Q27RHGA07XXQA9T190XJ20_z.webp", "ten": [[36, 286, 299, 10764, 1], [43, 278, 289, 12427, 0]]}, {"id": "gold-en-suite-plus", "name": "Gold En Suite Plus", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1395/01KCC1JJ842PCJB1N5S9PYDCE9_z.webp", "ten": [[43, 255, 266, 11438, 0], [36, 267, 280, 10080, 0]]}, {"id": "gold-en-suite-deluxe-plus", "name": "Gold En Suite Deluxe Plus", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": null, "ten": [[43, 260, 271, 11653, 0], [36, 272, 285, 10260, 0]]}, {"id": "platinum-en-suite-plus", "name": "Platinum En Suite Plus", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1397/01K9MFMJ5NSWA9V1VMJK5WYW96_z.webp", "ten": [[43, 265, 276, 11868, 0], [36, 278, 291, 10476, 0]]}, {"id": "platinum-en-suite-deluxe-plus", "name": "Platinum En Suite Deluxe Plus", "kind": "ensuite", "size": "14–15 m²", "m2": 14.5, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": null, "ten": [[43, 269, 280, 12040, 0], [36, 282, 295, 10620, 0]]}, {"id": "diamond-en-suite-plus", "name": "Diamond En Suite Plus", "kind": "ensuite", "size": "14.5–15 m²", "m2": 14.75, "bed": "Small Double", "kitchen": "Shared kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9HY5JXWHYJN5TZ5PDF7YH12_z.webp", "ten": [[43, 275, 286, 12298, 0], [36, 283, 296, 10656, 0]]}, {"id": "silver-studio", "name": "Silver Studio", "kind": "studio", "size": "16.5–19 m²", "m2": 17.75, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9A7SQVFGM55GJJE85AN79D7_z.webp", "ten": [[51, 322, 329, 16779, 1], [44, 346, 355, 15620, 1], [43, 309, 329, 14147, 0]]}, {"id": "silver-studio-plus", "name": "Silver Studio Plus", "kind": "studio", "size": "19–21.5 m²", "m2": 20.25, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1381/01KCPE33A73FMFKHSBV8NT9V4D_z.webp", "ten": [[51, 326, 333, 16983, 1], [44, 350, 359, 15796, 1], [43, 317, 337, 14491, 0]]}, {"id": "silver-studio-deluxe", "name": "Silver Studio Deluxe", "kind": "studio", "size": "17.5–18.5 m²", "m2": 18.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9CRN651R5VJ0BGCD1BHRHJB_z.webp", "ten": [[51, 328, 335, 17085, 1], [44, 352, 361, 15884, 1], [43, 317, 337, 14491, 0]]}, {"id": "gold-studio-deluxe", "name": "Gold Studio Deluxe", "kind": "studio", "size": "16.5–19 m²", "m2": 17.75, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1389/01K9MFGX9J0TAYB41NVDRF2REG_z.webp", "ten": [[51, 346, 353, 18003, 1], [44, 372, 381, 16764, 1], [43, 329, 349, 15007, 1]]}, {"id": "silver-studio-deluxe-plus", "name": "Silver Studio Deluxe Plus", "kind": "studio", "size": "19.5–20.5 m²", "m2": 20.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1385/01K9FC4CT612XJWGWVGBWN6KB6_z.webp", "ten": [[51, 332, 339, 17289, 1], [43, 319, 339, 14577, 0]]}, {"id": "platinum-studio", "name": "Platinum Studio", "kind": "studio", "size": "17.5–18.5 m²", "m2": 18.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1397/01K9FBPVVRSSM6N5Y4KNT9V4D9_z.webp", "ten": [[51, 352, 359, 18309, 1], [43, 334, 354, 15222, 1], [36, 349, 374, 13464, 0]]}, {"id": "diamond-studio-deluxe", "name": "Diamond Studio Deluxe", "kind": "studio", "size": "17.5–18.5 m²", "m2": 18.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1399/01K9Q3SXMF9A63SVJY8484XKPW_z.webp", "ten": [[51, 356, 363, 18513, 1], [44, 383, 392, 17248, 1], [43, 339, 359, 15437, 1]]}, {"id": "gold-studio", "name": "Gold Studio", "kind": "studio", "size": "17.5–18.5 m²", "m2": 18.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1393/01K9HYHK51JS9DYNMEQFKJ44YN_z.webp", "ten": [[51, 340, 347, 17697, 1], [43, 327, 347, 14921, 0]]}, {"id": "penthouse-studio-deluxe", "name": "Penthouse Studio Deluxe", "kind": "studio", "size": "17.5–18.5 m²", "m2": 18.0, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1399/01K9SRPQEKACKH9D7WPP13YSK6_z.webp", "ten": [[51, 367, 374, 19074, 1], [44, 395, 404, 17776, 1], [43, 349, 369, 15867, 1]]}, {"id": "platinum-studio-deluxe", "name": "Platinum Studio Deluxe", "kind": "studio", "size": "16.5–18.5 m²", "m2": 17.5, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1381/01K9HZCWK5P8JN97ACMD4QVJRF_z.webp", "ten": [[51, 348, 355, 18105, 1], [44, 374, 383, 16852, 1], [35, 365, 365, 12775, 1]]}, {"id": "diamond-studio-deluxe-plus", "name": "Diamond Studio Deluxe Plus", "kind": "studio", "size": "19.5–21.5 m²", "m2": 20.5, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1391/01KBZ7XPK1AT5K41ZNG1QA22YJ_z.webp", "ten": [[51, 377, 384, 19584, 1], [43, 349, 369, 15867, 1], [36, 365, 390, 14040, 0]]}, {"id": "gold-studio-deluxe-plus", "name": "Gold Studio Deluxe Plus", "kind": "studio", "size": "19–21.5 m²", "m2": 20.25, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1397/01K9Q2ZJP7EMSXBX0YVPEMDDN3_z.webp", "ten": [[51, 349, 356, 18156, 1], [44, 375, 384, 16896, 0], [43, 336, 356, 15308, 0]]}, {"id": "platinum-studio-deluxe-plus", "name": "Platinum Studio Deluxe Plus", "kind": "studio", "size": "19–21.5 m²", "m2": 20.25, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1389/01K9SR9GWV7YDQKR3KGPADMJQF_z.webp", "ten": [[51, 357, 364, 18564, 1], [44, 384, 393, 17292, 0], [43, 339, 359, 15437, 0]]}, {"id": "penthouse-studio-deluxe-plus", "name": "Penthouse Studio Deluxe Plus", "kind": "studio", "size": "19–21.5 m²", "m2": 20.25, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1391/01K9W6QHFEHGFB3PGZ6SMPM9CA_z.webp", "ten": [[51, 372, 379, 19329, 1], [44, 400, 409, 17996, 1], [43, 359, 379, 16297, 1]]}, {"id": "silver-studio-superior", "name": "Silver Studio Superior", "kind": "studio", "size": "29.5 m²", "m2": 29.5, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1395/01K9A7R7XADYJBJ4K79WNAYG4T_z.webp", "ten": [[51, 349, 356, 18156, 0], [43, 342, 362, 15566, 0]]}, {"id": "gold-studio-superior", "name": "Gold Studio Superior", "kind": "studio", "size": "29.5 m²", "m2": 29.5, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1389/01K9CT41DTACJSKANV07KXF5T8_z.webp", "ten": [[51, 370, 377, 19227, 0], [43, 357, 377, 16211, 0]]}, {"id": "platinum-studio-superior", "name": "Platinum Studio Superior", "kind": "studio", "size": "29.5–30 m²", "m2": 29.75, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1383/01K9FC9EF26PEK4PSNTR2PAB1Z_z.webp", "ten": [[51, 375, 382, 19482, 0], [43, 372, 392, 16856, 0]]}, {"id": "gold-studio-plus", "name": "Gold Studio Plus", "kind": "studio", "size": "19 m²", "m2": 19.0, "bed": "Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1399/01K9CRQDAMFEDGF802G1FH67DK_z.webp", "ten": [[43, 338, 349, 15007, 0]]}, {"id": "platinum-studio-plus", "name": "Platinum Studio Plus", "kind": "studio", "size": "19.5 m²", "m2": 19.5, "bed": "Small Double", "kitchen": "Private kitchen", "photo": "https://media.uhzcdn.com/image/1395/01K9MEZ85Y9Z9WEWB7B00YFXXH_z.webp", "ten": [[43, 353, 364, 15652, 0]]}],
  },
  hlx: {
    id: 'hlx', city: 'London', name: 'HL-Xavier Building', address: 'Coppermaker Square, London E20 1NG',
    url: 'https://en.uhomes.com/uk/london/detail-apartments-1763901', sector: 'Build-to-rent apartments', audience: 'Young professionals',
    campus: 'London College of Fashion, Olympic Park', distance: '0.2 mi', walk: 4,
    nearby: 'UCL East 0.8 mi · University of East London 0.8 mi',
    budget: [700, 1000], tenancies: [55, 52],
    billsAll: false, bills: 'Water and internet included; electricity not listed',
    advance: 'No deposit listed',
    guarantor: 'Local or international guarantor accepted for instalments',
    instalments: null,
    payInFull: 'Pay in full, or 2 instalments with a guarantor',
    policies: [['No visa, no pay', 'If your visa is refused, you can get prepaid rent and deposit back (conditions on uhomes).'], ['Pets allowed', 'Cats and dogs up to 32 kg, £75 a month each, up to 2 per flat.']],
    offer: { amt: 50, big: '£50', small: 'when a friend books', short: '£50 when a friend books', note: 'uhomes refer-a-friend, T&Cs on uhomes' },
    rating: 'No reviews yet',
    types: [{"id": "1-bed-1-bath", "name": "1 Bedroom 1 Bathroom", "kind": "apartment", "size": "Size not listed", "m2": 0, "bed": "Whole flat", "kitchen": "Own kitchen and living area", "photo": "https://image.uhzcdn.com/house/22/36701cf2f16a78f697a4cae6b4c13fe762e2b8.jpg?x-oss-process=image/resize,m_lfit,w_638,h_392,limit_0/interlace,1/quality,q_90/format,webp", "ten": [[55, 725, 725, 39875, 0]]}, {"id": "2-bed-2-bath", "name": "2 Bedroom 2 Bathroom", "kind": "share", "size": "Size not listed", "m2": 0, "bed": "Two bedrooms, whole flat", "kitchen": "Own kitchen and living area", "photo": "https://image.uhzcdn.com/house/2c/f170c6a620b9c6cf8cdd50969a2f0315bdd9a0.png?x-oss-process=image/resize,m_lfit,w_638,h_392,limit_0/interlace,1/quality,q_90/format,webp", "ten": [[52, 960, 960, 49920, 0]]}],
  },
};

// Countries and cities as listed on en.uhomes.com (checked 7 Nov 2026). Links go to the real city pages.
// Only Manchester and London have sample buildings in this prototype.
const U = 'https://en.uhomes.com';
const C = (code, name, cities) => ({ code, name, cities: cities.map(([n, slug]) => ({ name: n, url: `${U}/${code}/${slug}` })) });
export const COUNTRIES = [
  C('uk', 'United Kingdom', [['London', 'london'], ['Manchester', 'manchester'], ['Birmingham', 'birmingham'], ['Leeds', 'leeds'], ['Glasgow', 'glasgow'], ['Liverpool', 'liverpool'], ['Nottingham', 'nottingham'], ['Sheffield', 'sheffield'], ['Bristol', 'bristol'], ['Edinburgh', 'edinburgh'], ['Newcastle', 'newcastle'], ['Coventry', 'coventry'], ['Southampton', 'southampton'], ['Cardiff', 'cardiff'], ['Leicester', 'leicestershire'], ['Brighton', 'brighton'], ['Exeter', 'exeter'], ['Aberdeen', 'aberdeen']]),
  C('us', 'United States', [['New York', 'new-york'], ['Los Angeles', 'los-angeles'], ['Boston', 'boston'], ['Berkeley', 'berkeley'], ['Champaign', 'urbana-champaign'], ['Davis', 'davis'], ['Jersey City', 'jersey-city']]),
  C('au', 'Australia', [['Sydney', 'sydney'], ['Melbourne', 'melbourne'], ['Brisbane', 'brisbane'], ['Adelaide', 'adelaide']]),
  C('ca', 'Canada', [['Toronto', 'toronto'], ['Ottawa', 'ottawa']]),
  C('nz', 'New Zealand', [['Auckland', 'auckland']]),
  C('sg', 'Singapore', [['Singapore', 'singapore']]),
  C('hk', 'Hong Kong (China)', [['Hong Kong', 'hongkong']]),
  C('jp', 'Japan', [['Tokyo', 'tokyo']]),
];
export const SAMPLE_CITY = { Manchester: 'iq', London: 'hlx' };

// Kept for modules that only know the Manchester sample.
export const ROOM_TYPES = BUILDINGS.iq.types;

const money = (n) => '£' + Math.round(n).toLocaleString('en-GB');
export { money };

// One entry per room type and tenancy, exactly as listed on uhomes.
export function buildRooms(building = BUILDINGS.iq) {
  const rooms = [];
  for (const type of building.types) {
    for (const [weeks, wk, was, total, book] of type.ten) {
      rooms.push({
        id: `${type.id}-${weeks}`, type, weeks, wk, was, total, book: !!book,
        start: TENANCIES[weeks].start, bills: building.billsAll, accessible: false,
        building: building.id, campus: building.campus,
      });
    }
  }
  return rooms;
}

// Real reviews from the iQ Chandos House page on uhomes (8 Nov 2026): 4.9 from 12 reviews.
// Names are shown as uhomes shows them. Each keeps one short quote; the rest is our summary.
export const REVIEWS = {
  iq: {
    score: 4.9, count: 12, label: 'Excellent · a uhomes “Student favourite”',
    items: [
      { who: 'CHEN**', uni: 'University of Manchester', type: 'gold-en-suite-plus', room: 'Gold En Suite Plus', weeks: 44, stars: 5, quote: 'super close to campus and local amenities', gist: 'Spacious, clean room; friendly, responsive staff.' },
      { who: 'CHEN**', uni: 'University of Manchester', type: 'platinum-en-suite-plus', room: 'Platinum En Suite Plus', weeks: 51, stars: 5, quote: 'The kitchen is very spacious and has two refrigerators.', gist: 'Clean and quiet for study. Says the Wi-Fi is sometimes slow.' },
      { who: 'LI**', uni: 'University of Manchester', type: 'silver-studio', room: 'Silver Studio', weeks: 51, stars: 5, quote: 'I can’t hear noise from the hallway or next door', gist: 'Friendly front desk, new facilities. Wishes it had a pool.' },
      { who: 'WANG**', uni: 'University of Manchester', type: 'gold-studio-deluxe', room: 'Gold Studio Deluxe', weeks: 44, stars: 4, quote: 'just a ten-minute walk or so to the main campus', gist: 'Supermarkets close by, 24-hour desk for parcels, bills included.' },
      { who: 'ZHANG**', uni: 'University of Manchester', type: 'silver-studio-plus', room: 'Silver Studio Plus', weeks: 44, stars: 5, quote: 'the 147 bus stop just a two-minute walk away', gist: 'Clean, quiet and feels safe with security and a front desk.' },
      { who: 'WANG**', uni: 'University of Manchester', type: 'diamond-en-suite-deluxe-plus', room: 'Diamond En Suite Deluxe Plus', weeks: 44, stars: 5, quote: 'No signal while waiting for the elevator', gist: 'Rated it 5 stars; internet speed is okay otherwise.' },
    ],
  },
  hlx: { score: null, count: 0, label: 'No reviews on uhomes yet', items: [] },
};

// Real photos from the uhomes album for iQ Chandos House (By Landlord), 8 Nov 2026.
// Only a few listings get galleries in this showcase; the rest show their details.
const IMG = (id) => `https://media.uhzcdn.com/image/${id}_z.webp`;
const BUILDING_SHOTS = {
  exterior: [IMG('1391/01KC4BVKMWJ7M3S21XNC31A1ZV'), 'The building, Granby Row'],
  gym: [IMG('1393/01K9A6JW7Y2204DGEF7VM6HYVC'), 'Gym'],
  fitness: [IMG('1393/01K9A649JSVY33F9ZA81NKR6R3'), 'Fitness studio'],
  study: [IMG('1385/01K9A83CFJS81KQHH62JDE73HP'), 'Study space'],
  kitchen: [IMG('1381/01K9A6ZG4816X6FPR5QSXD7VVC'), 'Communal kitchen'],
  lounge: [IMG('1393/01K9A96WGPVAP0GBYQ863JXBVN'), 'Lounge'],
  entrance: [IMG('1381/01K9A9K6Z8YAPHKMRE297XFQRQ'), 'Entrance'],
  games: [IMG('1383/01K9A8JGVXF5WDETCAHBHFKXBK'), 'Games room'],
  music: [IMG('1385/01K9A88CYSTETZ55N203AV2NV9'), 'Music room'],
};
export const GALLERY = {
  'gold-en-suite': [
    [IMG('1395/01KC9JAHP4HTFKD54GTWM2A56T'), 'Gold En Suite: bedroom and en suite'],
    [IMG('1389/01KC9FPDJEDYJ04V394QZB30Y1'), 'Gold En Suite: shared flat kitchen and dining'],
    [IMG('1399/01KC9HR79ZA5DD6GHKP5B2P44T'), 'Gold En Suite: shared flat kitchen'],
    BUILDING_SHOTS.exterior, BUILDING_SHOTS.gym, BUILDING_SHOTS.study,
  ],
  'silver-studio': [
    [IMG('1391/01K9A7SQVFGM55GJJE85AN79D7'), 'Silver Studio: your own room and kitchen'],
    BUILDING_SHOTS.entrance, BUILDING_SHOTS.lounge, BUILDING_SHOTS.fitness, BUILDING_SHOTS.games, BUILDING_SHOTS.music,
  ],
};

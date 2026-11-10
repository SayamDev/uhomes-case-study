# uhomes homepage prototype — Product Engineer case study

**Live prototype:** https://sayamdev.github.io/uhomes-case-study/

A case-study prototype by Sayam Ajmal for a uhomes Product Engineer interview. **This is not the official uhomes website.** Nothing you type is sent anywhere, no account is created, and the page takes no payment. "Continue to book on uhomes" opens the real listing on uhomes.com.

## The idea

A new uhomes homepage for UK students: say what you need, see the rooms that fit, and know the full cost before you book.

1. **Find** — slide a budget, or describe what you need in your own words.
2. **Rooms** — every room says if it fits, with the weekly price and the total listed on uhomes.
3. **Book** — one checklist (dates, bills, payment plan, guarantor), then continue on uhomes.

## Honesty notes

- Listing data (rooms, prices, tenancies, photos, reviews) was read from uhomes.com for iQ Chandos House, Manchester, on 8 November 2026. It is not live.
- The "uhomes AI" step that reads a student's brief is simulated with fixed rules (`src/understand.js`) and is labelled on screen.
- Whether a room fits is decided by tested rules (`src/fit.js`), never by AI.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

The published site is the built output in `docs/`.

## Stack

Vite and plain JavaScript modules, three.js (the lit building), Motion (animation), @blossom-carousel/core, Fontsource fonts (Poppins, Bricolage Grotesque). Checked with Puppeteer and axe-core.

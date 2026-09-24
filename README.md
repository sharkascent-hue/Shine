# RealShine — website

Custom, dependency-free site for RealShine mobile car detailing (Louth, Cavan, Meath & Monaghan).
Plain HTML/CSS/JS — upload the folder to any static host.

- `index.html` — the whole page (hero, trust strip, before/after sliders, pricing, how it works, gallery, reviews, FAQ, booking)
- `css/style.css` — styles & animations
- `js/main.js` — intro animation, shine-wipe transitions, before/after sliders, horizontal gallery, WhatsApp booking form
- `img/` — optimised WebP images (600w / 1080w)

Run locally: `python3 -m http.server` in this folder, open http://localhost:8000.

## Open TODOs for the client
1. Silver SUV price — shows €135 (same as car). Confirm; edit `data-suv` in `index.html`.
2. Online payment provider (Stripe / SumUp…) — "Pay online" button is a placeholder.
3. Higher-res logo — header uses an SVG redraw; original PNG is only 224×98.
4. Real Google reviews to replace the placeholders.
5. Kildare left out until confirmed.

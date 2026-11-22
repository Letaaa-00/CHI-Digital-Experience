# CHI 2027 Digital Experience — Prototype

Responsive web prototype for CHI 2027 (Pittsburgh, May 10–14, 2027). Phone first, with tablet (≥760px) and desktop (≥1100px) layouts.

## Run it

No build step. Either open `index.html` in a browser, or serve the folder:

```bash
node serve.js
```

then visit http://localhost:4127.

## What's in it

- **Start page** — animated pixel mosaic of the domain icons, dates and venue, Join / Log in.
- **Join** — Attendee, Visitor or Guest mode.
- **Interest questions** — badge (name, email), role, a three-way interest mix, topic picks.
- **Icon reveal** — primary and secondary interest icons. The reveal animation plays straight after the questions (first time or a retake); opened from the dashboard's "Show my icon", the page shows the result directly.
- **Account dashboard** — a simple badge (interest icons and name), My Presentations, My Schedule, suggested events. Everyone starts with their two closest interests. A presenter's first icon is the domain they present in, the second is the closest domain from their answers, and a second domain they present in becomes the third icon. A further domain joins the badge once two events from it are saved (six icons at most, three to a row). The badge twists a little every few seconds to show it turns over. The mix bar under it shows each share in a small box on hover, hold or focus. A short tour runs the first time the dashboard opens; it holds the page until it is finished or skipped.
- **Creative badge** — the back of the badge (click to flip): the person's bio sentence (editable, 20 words) set as a tight collage with their interest icons, uploaded images and random graphics, name largest, centred on the card. No graphic lies on top of another, each interest's icon appears once, and there are no outline-only icons. The edit button at its bottom right opens the editor.
- **Home, Events, About** and a **Map** with a 2D crowd view and a 3D floor breakout. The 3D-to-2D arrival animation plays on the first visit only; after that the map opens straight on the 2D plan.

Sample presenter emails (fill My Presentations automatically): `alex.rivera@example.org`, `sam.okonkwo@example.org`. Any password works.

## Files

| Path | Contents |
|---|---|
| `index.html` | Page shell |
| `css/styles.css` | All styles; responsive rules at the end |
| `js/data.js` | Conference facts and sample sessions, rooms, people |
| `js/icons.js` | Domain icons, generated from `icon-assets/` |
| `js/fx.js` | Pixel animations |
| `js/creative.js` | Creative badge layout |
| `js/app.js` | Screens and routing |
| `js/map.js` | 2D and 3D map |
| `icon-assets/` | Source SVGs (`Asset 27` = Education, `Asset 28` = Social Computing) |

Conference facts come from chi2027.acm.org; sessions, rooms and people are placeholder content.

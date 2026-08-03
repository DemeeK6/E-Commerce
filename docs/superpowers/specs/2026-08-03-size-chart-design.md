# Size chart — design

**Date:** 2026-08-03
**Status:** Approved

## Problem

Shoppers cannot tell what "M" or "2XL" means in centimetres. The product details
page offers size chips with no reference measurements, and the store has no page
explaining how the sizes are measured. Clothing sold with Asian sizing makes this
worse — a shopper used to EU sizing has no way to translate.

## Goal

1. A **Sizes** tab in the store navigation, next to Products, leading to a page
   with a measurement table and a diagram showing where each measurement is taken.
2. A **Size guide** link under the size picker on the product details page that
   opens the same table in a modal, so the shopper never leaves the product.

## Scope

New files:

- `frontend/src/components/SizeChart.tsx`
- `frontend/src/components/SizeGuideModal.tsx`
- `frontend/src/pages/SizesPage.tsx`

Changed files:

- `frontend/src/App.tsx` — one route
- `frontend/src/layouts/StoreLayout.tsx` — nav link + footer link
- `frontend/src/pages/ProductDetailsPage.tsx` — size guide link + modal state
- `frontend/src/styles/global.css` — chart, modal and link styles
- `frontend/src/i18n/en.json`, `ka.json`, `ru.json` — new keys

No backend changes. No database changes. No new dependencies — the `Ruler` and
`X` icons come from `lucide-react`, which is already installed.

## Design

### Data

The measurements are a module-level constant in `SizeChart.tsx`. They are the
same for every product; there is no per-product or per-category variation, and
nothing is fetched from the API.

| Asian size | Shoulder | Bust | Sleeve | Length |
| ---------- | -------- | ---- | ------ | ------ |
| S          | 39       | 100  | 22.5   | 67     |
| M          | 40       | 105  | 23     | 68     |
| L          | 41       | 110  | 23.5   | 69     |
| XL         | 42       | 115  | 24     | 70     |
| 2XL        | 43       | 120  | 24.5   | 71     |
| 3XL        | 44       | 125  | 25     | 72     |
| 4XL        | 45       | 130  | 25.5   | 73     |
| 5XL        | 46       | 135  | 26     | 74     |

All values are centimetres. The column header renders the unit (`Bust CM`) so
the cells stay bare numbers.

### `SizeChart`

A presentational component taking no props. It renders, in order:

1. **Diagram** — an inline `<svg>` (`viewBox="0 0 420 260"`,
   `preserveAspectRatio="xMidYMid meet"`) drawing a long-sleeve garment outline
   as `<path>` strokes, with four measurement arrows and circled numbers ①–④
   marking shoulder, bust, length and sleeve.
2. **Legend** — the four numbered labels next to the diagram, text from `t()`.
3. **Header bar** — a grey `MEASUREMENT` band above the table.
4. **Table** — the rows above, inside a `div` with `overflow-x: auto`.

Colours come from existing CSS custom properties in `global.css` rather than
hardcoded hex values, so the chart matches the rest of the store. The only text
inside the SVG is the four marker digits; every word is HTML in the legend and
comes from `t()`, so the diagram translates without any SVG text reflow problems.

Being props-free and side-effect-free means both the page and the modal render
the identical component, and the numbers cannot drift between the two.

### `SizeGuideModal`

Props: `{ onClose: () => void }`.

A fixed-position backdrop containing a scrollable card that renders
`<SizeChart />` and a close button. Behaviour:

- `role="dialog"`, `aria-modal="true"`, `aria-label` from `t('sizeGuide')`.
- Closes on the X button, on backdrop click (but not on clicks inside the card),
  and on `Escape`.
- The `Escape` listener is registered in a `useEffect` and removed on unmount.
- While open, `document.body.style.overflow = 'hidden'` prevents the page behind
  from scrolling; the effect cleanup restores the previous value.

The component owns no open/closed state — the parent decides whether to render it.

### `SizesPage`

`<section className="section">` containing an eyebrow, an `<h1>` from
`t('sizes')`, an intro paragraph from `t('sizeChartIntro')`, and `<SizeChart />`.

### Navigation

In `StoreLayout`, `<NavLink to="/sizes">{t('sizes')}</NavLink>` goes immediately
after the Products link inside the existing `nav` fragment. Because that fragment
is rendered by both `.desktop-nav` and `.mobile-nav`, the single line covers both
breakpoints. A matching `<Link>` is added to the footer link column.

The route `<Route path="sizes" element={<SizesPage />} />` sits inside the
`StoreLayout` route block in `App.tsx`, after `products/:id`.

### Product details entry point

Under the size `option-group` in `ProductDetailsPage`:

```tsx
<button className="size-guide-link" onClick={() => setGuideOpen(true)}>
  <Ruler size={16} />
  {t('sizeGuide')}
</button>
```

`const [guideOpen, setGuideOpen] = useState(false)` drives
`{guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}`.

It is a `<button>`, not an `<a>` — it opens an overlay rather than navigating, so
a link element would be wrong for keyboard and screen-reader users. It is styled
to look like a quiet text link.

### Translation keys

Added identically to `en.json`, `ka.json` and `ru.json`:

| Key              | English                                                    |
| ---------------- | ---------------------------------------------------------- |
| `sizeGuide`      | Size guide                                                 |
| `sizeChartIntro` | All measurements are in centimetres and may vary by 1–2 cm. |
| `measurement`    | Measurement                                                |
| `asianSize`      | Asian size                                                 |
| `shoulder`       | Shoulder                                                   |
| `bust`           | Bust                                                       |
| `sleeve`         | Sleeve                                                     |
| `length`         | Length                                                     |
| `close`          | Close                                                      |

`sizes` already exists in all three files (`Sizes` / `ზომები` / `Размеры`) and is
reused for the tab label and page heading. `size` also already exists and is
unchanged.

### Styles

Added to `global.css`:

- `.size-chart` — grid holding diagram and legend, collapsing to one column
  under 640px.
- `.size-chart-table-wrap` — `overflow-x: auto` so the five columns scroll
  horizontally on a narrow screen instead of forcing the page to scroll.
- `.size-chart table` — full width, collapsed borders, dotted row separators and
  alternating row backgrounds, matching the attached reference.
- `.size-guide-link` — inline flex, icon plus underlined text, muted colour.
- `.modal-backdrop` / `.modal-card` — fixed full-screen dim layer and a centred
  card with `max-height: 90vh` and `overflow-y: auto`.

## Error handling

There is no network call, no user input and no state that can be invalid, so
there are no error paths. The failure modes that remain are layout ones:

- Five columns on a 375px screen — handled by the horizontal scroll wrapper.
- A tall chart inside the modal on a short screen — handled by
  `max-height: 90vh` plus vertical scroll on the card.
- Long Georgian and Russian labels overflowing the SVG legend — the legend is
  HTML beside the SVG rather than text inside it, so it wraps normally.

## Verification

No test framework is installed in this repository (no vitest, jest or testing
library in `frontend/package.json`), so verification is a typecheck plus manual
exercise in the browser:

1. `npm run build` in `frontend/` — must pass with no TypeScript errors.
2. Dev server: the Sizes tab appears next to Products and routes to `/sizes`.
3. The page renders the diagram and all eight table rows.
4. Switching the language selector to KA and then RU translates the heading,
   intro, column headers and legend, with no raw keys visible.
5. On a product details page, the size guide link appears under the size chips,
   opens the modal, and the modal closes via X, backdrop click and Escape.
6. At a 375px viewport the page does not scroll horizontally; the table scrolls
   inside its own container.

## Out of scope

- Per-product or per-category size charts.
- Admin-editable chart data (no entity, migration, API or admin screen).
- Inch/centimetre unit toggle.
- A "find my size" calculator.

# Size Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sizes tab to the store navigation leading to a measurement chart page, and a size guide link on the product details page that opens the same chart in a modal.

**Architecture:** One props-free presentational component (`SizeChart`) holds the measurement data, an inline SVG diagram and the table. A page (`SizesPage`) and a modal (`SizeGuideModal`) each render that component, so the numbers cannot drift between the two surfaces. No backend, no database, no API calls — the data is a module-level constant.

**Tech Stack:** React 19, TypeScript 5.9, react-router-dom 7, Vite 7, lucide-react (already installed). Plain CSS in a single `global.css`.

## Global Constraints

- **No new dependencies.** `Ruler` and `X` icons come from `lucide-react`, already in `frontend/package.json`.
- **No backend changes.** Do not touch anything under `backend/`.
- **All three locale files must stay in sync.** `frontend/src/context/I18nContext.tsx:7` declares `type Dictionary = typeof en`, and `dictionaries` is typed `Record<Language, Dictionary>`. A key added to `en.json` but missing from `ka.json` or `ru.json` is a **compile error**, not a runtime fallback. Every new key goes into all three files.
- **`t()` only accepts keys that exist in `en.json`.** Never pass a string literal that is not a key.
- **Reuse the existing `sizes` key** (`Sizes` / `ზომები` / `Размеры`, line 73 of each locale file) for the nav tab and page heading. Do not add a duplicate.
- **Colours must use the existing CSS custom properties** declared at `frontend/src/styles/global.css:5-11`: `--ink: #181818`, `--muted: #72716d`, `--paper: #ffffff`, `--line: #dedbd2`, `--accent: #7d2636`, `--pine: #23433d`.
- **Measurements are fixed:** S/M/L/XL/2XL/3XL/4XL/5XL, in centimetres, exactly the values in Task 2. Do not round, reorder or invent rows.
- **There is no test framework in this repository.** `frontend/package.json` has no vitest, jest or testing-library. The verification gate for every task is `npm run build` (which runs `tsc` then `vite build`) plus browser checks. Do not add a test framework.
- All commands run from `C:\Git\E-Commerce\frontend` unless stated otherwise.

---

### Task 1: Translation keys

**Files:**
- Modify: `frontend/src/i18n/en.json`
- Modify: `frontend/src/i18n/ka.json`
- Modify: `frontend/src/i18n/ru.json`

**Interfaces:**
- Consumes: nothing.
- Produces: nine new `t()` keys used by every later task — `sizeGuide`, `sizeChartIntro`, `measurement`, `asianSize`, `shoulder`, `bust`, `sleeve`, `length`, `close`.

- [ ] **Step 1: Add the keys to `en.json`**

Open `frontend/src/i18n/en.json`. The file currently ends with:

```json
  "delivered": "Delivered",
  "cancelled": "Cancelled"
}
```

Change that ending to:

```json
  "delivered": "Delivered",
  "cancelled": "Cancelled",
  "sizeGuide": "Size guide",
  "sizeChartIntro": "All measurements are in centimetres and may vary by 1-2 cm.",
  "measurement": "Measurement",
  "asianSize": "Asian size",
  "shoulder": "Shoulder",
  "bust": "Bust",
  "sleeve": "Sleeve",
  "length": "Length",
  "close": "Close"
}
```

- [ ] **Step 2: Add the same keys to `ka.json`**

`frontend/src/i18n/ka.json` currently ends with:

```json
  "delivered": "მიტანილია",
  "cancelled": "გაუქმებულია"
}
```

Change that ending to:

```json
  "delivered": "მიტანილია",
  "cancelled": "გაუქმებულია",
  "sizeGuide": "ზომების გზამკვლევი",
  "sizeChartIntro": "ყველა ზომა მოცემულია სანტიმეტრებში და შესაძლოა 1-2 სმ-ით განსხვავდებოდეს.",
  "measurement": "გაზომვა",
  "asianSize": "აზიური ზომა",
  "shoulder": "მხარი",
  "bust": "გულმკერდი",
  "sleeve": "სახელო",
  "length": "სიგრძე",
  "close": "დახურვა"
}
```

- [ ] **Step 3: Add the same keys to `ru.json`**

Append the same nine keys to the end of `frontend/src/i18n/ru.json`, after `"cancelled"`, adding a comma to the `"cancelled"` line:

```json
  "sizeGuide": "Таблица размеров",
  "sizeChartIntro": "Все измерения указаны в сантиметрах и могут отличаться на 1-2 см.",
  "measurement": "Измерения",
  "asianSize": "Азиатский размер",
  "shoulder": "Плечо",
  "bust": "Грудь",
  "sleeve": "Рукав",
  "length": "Длина",
  "close": "Закрыть"
}
```

- [ ] **Step 4: Verify all three files parse and the dictionaries still type-match**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors. If a key is missing from `ka.json` or `ru.json` you will get an error on `frontend/src/context/I18nContext.tsx:9` saying the type is missing a property — add the missing key and rerun.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/en.json frontend/src/i18n/ka.json frontend/src/i18n/ru.json
git commit -m "feat(i18n): add size chart translation keys"
```

---

### Task 2: `SizeChart` component and styles

**Files:**
- Create: `frontend/src/components/SizeChart.tsx`
- Modify: `frontend/src/styles/global.css` (append at end of file)

**Interfaces:**
- Consumes: `useI18n` from `../context/I18nContext`; the keys from Task 1.
- Produces: `export function SizeChart(): JSX.Element` — takes **no props**. Task 3 and Task 4 both import it as `import { SizeChart } from '../components/SizeChart'` and `from './SizeChart'` respectively.

- [ ] **Step 1: Create the component**

Create `frontend/src/components/SizeChart.tsx` with exactly this content:

```tsx
import { useI18n } from '../context/I18nContext';

const SIZE_ROWS = [
  { size: 'S', shoulder: '39', bust: '100', sleeve: '22.5', length: '67' },
  { size: 'M', shoulder: '40', bust: '105', sleeve: '23', length: '68' },
  { size: 'L', shoulder: '41', bust: '110', sleeve: '23.5', length: '69' },
  { size: 'XL', shoulder: '42', bust: '115', sleeve: '24', length: '70' },
  { size: '2XL', shoulder: '43', bust: '120', sleeve: '24.5', length: '71' },
  { size: '3XL', shoulder: '44', bust: '125', sleeve: '25', length: '72' },
  { size: '4XL', shoulder: '45', bust: '130', sleeve: '25.5', length: '73' },
  { size: '5XL', shoulder: '46', bust: '135', sleeve: '26', length: '74' },
];

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="var(--accent)" />
      <text x={x} y={y} dy=".34em" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{n}</text>
    </g>
  );
}

export function SizeChart() {
  const { t } = useI18n();

  return (
    <div className="size-chart">
      <div className="size-chart-figure">
        <svg viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('measurement')}>
          <defs>
            <marker id="size-chart-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>

          {/* garment outline */}
          <path
            d="M 100 58 C 112 74, 148 74, 160 58 L 175 62 L 218 92 L 232 200 L 200 208 L 182 120 L 182 250 L 78 250 L 78 120 L 60 208 L 28 200 L 42 92 L 85 62 Z"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <g stroke="var(--accent)" strokeWidth="1.5" fill="none">
            {/* 1 shoulder */}
            <line x1="85" y1="38" x2="85" y2="62" />
            <line x1="175" y1="38" x2="175" y2="62" />
            <line x1="85" y1="44" x2="116" y2="44" markerStart="url(#size-chart-arrow)" />
            <line x1="144" y1="44" x2="175" y2="44" markerEnd="url(#size-chart-arrow)" />

            {/* 2 bust */}
            <line x1="78" y1="130" x2="116" y2="130" markerStart="url(#size-chart-arrow)" />
            <line x1="144" y1="130" x2="182" y2="130" markerEnd="url(#size-chart-arrow)" />

            {/* 3 length */}
            <line x1="250" y1="62" x2="266" y2="62" />
            <line x1="250" y1="250" x2="266" y2="250" />
            <line x1="258" y1="62" x2="258" y2="146" markerStart="url(#size-chart-arrow)" />
            <line x1="258" y1="166" x2="258" y2="250" markerEnd="url(#size-chart-arrow)" />

            {/* 4 sleeve length */}
            <line x1="73" y1="56" x2="54" y2="102" markerStart="url(#size-chart-arrow)" />
            <line x1="38" y1="148" x2="16" y2="194" markerEnd="url(#size-chart-arrow)" />
          </g>

          <Marker x={130} y={44} n={1} />
          <Marker x={130} y={130} n={2} />
          <Marker x={258} y={156} n={3} />
          <Marker x={46} y={125} n={4} />
        </svg>

        <ol className="size-chart-legend">
          <li><b>1</b>{t('shoulder')}</li>
          <li><b>2</b>{t('bust')}</li>
          <li><b>3</b>{t('length')}</li>
          <li><b>4</b>{t('sleeve')}</li>
        </ol>
      </div>

      <div>
        <p className="size-chart-heading">{t('measurement')}</p>
        <div className="size-chart-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('asianSize')}</th>
                <th>{t('shoulder')} CM</th>
                <th>{t('bust')} CM</th>
                <th>{t('sleeve')} CM</th>
                <th>{t('length')} CM</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map(row => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  <td>{row.shoulder}</td>
                  <td>{row.bust}</td>
                  <td>{row.sleeve}</td>
                  <td>{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

Notes for the implementer:
- The `<ol>` numbers are visually replaced by the `<b>` badges; `list-style: none` in the CSS below hides the browser's own numbering.
- `orient="auto-start-reverse"` makes one `<marker>` definition work for both `markerStart` and `markerEnd`.
- The measurement lines are drawn in two segments with a gap so the numbered badge sits on the line without being crossed by it.

- [ ] **Step 2: Append the styles**

Append to the very end of `frontend/src/styles/global.css`:

```css
/* ---------- size chart ---------- */
.size-chart {
  display: grid;
  gap: 26px;
}

.size-chart-figure {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.size-chart-figure svg {
  width: 100%;
  height: auto;
}

.size-chart-legend {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.size-chart-legend li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
}

.size-chart-legend b {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
}

.size-chart-heading {
  margin: 0;
  padding: 13px 18px;
  background: var(--ink);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-radius: 6px 6px 0 0;
}

.size-chart-table-wrap {
  overflow-x: auto;
  background: var(--paper);
  border: 1px solid var(--line);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.size-chart table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  text-align: center;
}

.size-chart th,
.size-chart td {
  padding: 12px 10px;
  border-bottom: 1px dashed var(--line);
  white-space: nowrap;
}

.size-chart th {
  background: #f2f1ec;
  font-weight: 800;
}

.size-chart td:first-child {
  font-weight: 800;
}

.size-chart tbody tr:nth-child(even) {
  background: #fbfbf9;
}

.size-chart tbody tr:last-child td {
  border-bottom: none;
}

.size-chart-note {
  margin: 0;
  color: var(--muted);
}

@media (max-width: 720px) {
  .size-chart-figure {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors. The component is not rendered anywhere yet — this step only proves it type-checks.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SizeChart.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add SizeChart component with measurement diagram and table"
```

---

### Task 3: Sizes page, route and navigation tab

**Files:**
- Create: `frontend/src/pages/SizesPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/StoreLayout.tsx`
- Modify: `frontend/src/styles/global.css` (append)

**Interfaces:**
- Consumes: `SizeChart` from Task 2; `sizeChartIntro` and `sizes` keys.
- Produces: the `/sizes` route. Nothing later depends on it.

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/SizesPage.tsx`:

```tsx
import { useI18n } from '../context/I18nContext';
import { SizeChart } from '../components/SizeChart';

export function SizesPage() {
  const { t } = useI18n();

  return (
    <section className="section">
      <div className="size-page-heading">
        <p className="eyebrow">{t('menswear')}</p>
        <h1>{t('sizes')}</h1>
        <p className="size-chart-note">{t('sizeChartIntro')}</p>
      </div>
      <SizeChart />
    </section>
  );
}
```

- [ ] **Step 2: Register the route**

In `frontend/src/App.tsx`, add the import next to the other page imports (after the `ProductDetailsPage` import on line 7):

```tsx
import { SizesPage } from './pages/SizesPage';
```

Then, inside the `<Route element={<StoreLayout />}>` block, add the route immediately after the `products/:id` line:

```tsx
        <Route path="products/:id" element={<ProductDetailsPage />} />
        <Route path="sizes" element={<SizesPage />} />
```

- [ ] **Step 3: Add the nav tab and footer link**

In `frontend/src/layouts/StoreLayout.tsx`, inside the `nav` fragment, add one line after the Products `NavLink` (line 17):

```tsx
      <NavLink to="/products" onClick={() => setOpen(false)}>{t('products')}</NavLink>
      <NavLink to="/sizes" onClick={() => setOpen(false)}>{t('sizes')}</NavLink>
```

This single line covers both the desktop and the mobile menu, because `.desktop-nav` and `.mobile-nav` both render the same `nav` variable.

In the same file, add a footer link after the Products footer link (line 74):

```tsx
          <Link to="/products">{t('products')}</Link>
          <Link to="/sizes">{t('sizes')}</Link>
```

- [ ] **Step 4: Append the page heading style**

Append to the end of `frontend/src/styles/global.css`:

```css
.size-page-heading {
  display: grid;
  gap: 10px;
  margin-bottom: 30px;
  max-width: 640px;
}

.size-page-heading h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1;
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Verify it renders**

Start the dev server via the preview tooling (`preview_start`, config name from `.claude/launch.json`; create the config with `runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 5173` if it does not exist). Then:

1. On the home page, confirm a **Sizes** tab appears in the header between Products and the admin/login links.
2. Click it. Confirm the URL becomes `/sizes` and the page shows the heading, the intro line, the garment diagram with four numbered markers, the legend, and a table with 8 rows (S through 5XL).
3. Check `read_console_messages` — expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/SizesPage.tsx frontend/src/App.tsx frontend/src/layouts/StoreLayout.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add Sizes nav tab and size chart page"
```

---

### Task 4: Size guide modal on the product details page

**Files:**
- Create: `frontend/src/components/SizeGuideModal.tsx`
- Modify: `frontend/src/pages/ProductDetailsPage.tsx`
- Modify: `frontend/src/styles/global.css` (append)

**Interfaces:**
- Consumes: `SizeChart` from Task 2; the `sizeGuide`, `sizeChartIntro` and `close` keys from Task 1; the `.size-page-heading` and `.size-chart-note` CSS classes added in Tasks 3 and 2 — do not redefine them, this task only adds an override for them inside `.modal-card`.
- Produces: `export function SizeGuideModal({ onClose }: { onClose: () => void }): JSX.Element`. The component owns no open/closed state — the parent decides whether to render it.

- [ ] **Step 1: Create the modal**

Create `frontend/src/components/SizeGuideModal.tsx`:

```tsx
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { SizeChart } from './SizeChart';

export function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={() => closeRef.current()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('sizeGuide')}
        onClick={event => event.stopPropagation()}
      >
        <button className="modal-close" onClick={() => closeRef.current()} aria-label={t('close')}>
          <X size={18} />
        </button>
        <div className="size-page-heading">
          <h2>{t('sizeGuide')}</h2>
          <p className="size-chart-note">{t('sizeChartIntro')}</p>
        </div>
        <SizeChart />
      </div>
    </div>
  );
}
```

Why the ref: the parent passes a fresh arrow function on every render, so putting `onClose` in the effect's dependency array would tear down and re-register the `keydown` listener and the `body` overflow lock on every parent render. The ref keeps the effect running once per mount while always calling the latest callback.

Why the `stopPropagation`: without it, a click anywhere inside the card would bubble to the backdrop and close the dialog.

- [ ] **Step 2: Wire it into the product details page**

In `frontend/src/pages/ProductDetailsPage.tsx`:

Change the icon import on line 1 to include `Ruler`:

```tsx
import { Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
```

Add the modal import after the `format` import:

```tsx
import { SizeGuideModal } from '../components/SizeGuideModal';
```

Add the state next to the other `useState` calls (after `const [quantity, setQuantity] = useState(1);`):

```tsx
  const [guideOpen, setGuideOpen] = useState(false);
```

Replace the size `option-group` block (currently lines 45-48) with:

```tsx
        <div className="option-group">
          <span>{t('size')}</span>
          <div>{product.sizes.map(item => <button className={size === item ? 'selected' : ''} key={item} onClick={() => setSize(item)}>{item}</button>)}</div>
          <button className="size-guide-link" onClick={() => setGuideOpen(true)}>
            <Ruler size={16} />
            {t('sizeGuide')}
          </button>
        </div>
```

Add the modal render just before the closing `</section>` of the component:

```tsx
      {guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}
    </section>
```

The size guide control is a `<button>`, not an `<a>` — it opens an overlay rather than navigating, so a link element would be wrong for keyboard and screen-reader users.

- [ ] **Step 3: Append the modal and link styles**

Append to the end of `frontend/src/styles/global.css`:

```css
/* ---------- size guide modal ---------- */
.option-group .size-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 0;
  margin-top: 12px;
  padding: 0;
  border: none;
  background: none;
  box-shadow: none;
  color: var(--muted);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.option-group .size-guide-link:hover {
  color: var(--ink);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(24, 24, 24, 0.55);
}

.modal-card {
  position: relative;
  width: min(880px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px clamp(18px, 4vw, 32px);
  background: #f7f7f4;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
}

.modal-card .size-page-heading {
  margin-bottom: 22px;
  padding-right: 44px;
}

.modal-card h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.1;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}
```

The `.option-group .size-guide-link` selector has two classes so it outranks the existing `.option-group button` rule at `global.css:414`, which would otherwise give the link a border, a background and a 40px minimum height.

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Verify the interaction**

With the dev server running, open any product details page (`/products/1`, or click a product from `/products`). Then:

1. Confirm a **Size guide** link with a ruler icon appears directly under the size chips, styled as quiet underlined text — not as another size chip.
2. Click it. Confirm the modal opens over the page showing the same diagram and table.
3. Confirm the page behind the modal does not scroll.
4. Press `Escape`. Confirm the modal closes.
5. Reopen, click the dim area outside the card. Confirm it closes.
6. Reopen, click inside the card (on the table). Confirm it does **not** close.
7. Reopen, click the X button. Confirm it closes.
8. Confirm the page behind scrolls again after closing.
9. Check `read_console_messages` — expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SizeGuideModal.tsx frontend/src/pages/ProductDetailsPage.tsx frontend/src/styles/global.css
git commit -m "feat(frontend): add size guide modal to product details page"
```

---

### Task 5: Translation and responsive verification

**Files:**
- Modify (only if a defect is found): `frontend/src/i18n/*.json`, `frontend/src/styles/global.css`, `frontend/src/components/SizeChart.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing new — this is the acceptance gate.

- [ ] **Step 1: Check Georgian**

With the dev server running, set the header language selector to **KA** and go to `/sizes`. Confirm:
- The nav tab reads `ზომები`.
- The heading reads `ზომები` and the intro is Georgian.
- The legend reads `მხარი`, `გულმკერდი`, `სიგრძე`, `სახელო`.
- The table header reads `აზიური ზომა`, `მხარი CM`, `გულმკერდი CM`, `სახელო CM`, `სიგრძე CM`.
- No raw keys (for example a literal `sizeChartIntro`) are visible anywhere.
- The legend labels wrap instead of overflowing their box.

- [ ] **Step 2: Check Russian**

Switch to **RU**. Confirm the tab reads `Размеры`, the legend reads `Плечо`, `Грудь`, `Длина`, `Рукав`, and the table header reads `Азиатский размер`. Open a product page and confirm the link reads `Таблица размеров`.

- [ ] **Step 3: Check mobile width**

Resize the viewport to 375 x 812 (`resize_window` with `preset: "mobile"`). On `/sizes` confirm:
- The page body does **not** scroll horizontally — check with `javascript_tool`:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Expected: `true`.
- The table scrolls horizontally inside its own container — check:

```js
(() => { const el = document.querySelector('.size-chart-table-wrap'); return el.scrollWidth > el.clientWidth; })()
```

Expected: `true`.
- The diagram and legend stack vertically instead of sitting side by side.

Then open a product page at the same width, open the size guide, and confirm the modal card fits on screen and scrolls internally rather than being cut off.

- [ ] **Step 4: Capture proof**

Take a screenshot of `/sizes` at desktop width and one of the open modal, and report them.

- [ ] **Step 5: Commit any fixes**

If steps 1-3 required changes:

```bash
git add -A frontend/src
git commit -m "fix(frontend): size chart translation and responsive fixes"
```

If nothing needed fixing, skip this step — there is nothing to commit.

---

## Done when

- A Sizes tab sits next to Products in both the desktop and mobile nav and routes to `/sizes`.
- `/sizes` shows the diagram, the legend and all eight measurement rows.
- The product details page has a size guide link under the size chips that opens the same chart in a modal, closable by X, backdrop and Escape.
- All text renders correctly in English, Georgian and Russian.
- `npm run build` passes.

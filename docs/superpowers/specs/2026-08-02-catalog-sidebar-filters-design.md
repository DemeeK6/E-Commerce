# Catalog sidebar filters — design

**Date:** 2026-08-02
**Status:** Approved

## Problem

On the Products page the category filter is a `<select>` dropdown tucked into the
top-right corner of the heading row, next to the search box. Categories are a
primary way to browse a clothing catalog, so they should be visible as a list
rather than hidden behind a dropdown.

## Goal

Move both the search box and the category filter out of the top-right heading row
into a persistent left sidebar. The category filter becomes a visible vertical
list instead of a dropdown.

## Scope

Two files:

- `frontend/src/pages/ProductsPage.tsx`
- `frontend/src/styles/global.css`

No backend changes. No new translation keys — `categories`, `allCategories` and
`searchProducts` already exist in `en.json`, `ru.json` and `ka.json`.

## Design

### Layout

Below the heading, the page becomes a two-column grid (`.catalog-layout`):

| Column  | Width            | Contents          |
| ------- | ---------------- | ----------------- |
| Sidebar | `240px`          | Search + category list |
| Main    | `minmax(0, 1fr)` | Product grid      |

`align-items: start` so the sidebar does not stretch to the grid's height.

### Sidebar

Top to bottom:

1. Search input — reuses the existing `.search-label` / `.search-input` styles,
   widened to fill the column.
2. A `Categories` heading, using the existing `t('categories')` string.
3. A vertical list of filter buttons: **All categories** first, then one row per
   category from `api.categories(0)`.

Each row is a `<button type="button">` inside a `<ul>`, not an anchor — this is
client-side state, not navigation. The active row is marked with
`aria-pressed` and styled with darker text plus a left accent bar.

### Heading row

Keeps only the `menCollection` eyebrow and the `products` title. The
`.catalog-filters` block is removed entirely, as is the now-unused
`SlidersHorizontal` import.

### Product grid

Drops from 4 columns to 3 within the catalog layout, so cards keep roughly their
current width in the narrower content area. This is scoped to
`.catalog-layout .product-grid` so other pages using `.product-grid` are
unaffected.

### Responsive

At the existing `980px` breakpoint the layout collapses to a single column: the
sidebar stacks above the grid and the category list becomes a horizontal
wrapping row of chips, mirroring what `.admin-sidebar nav` already does at that
width. The existing `640px` rule already drops the product grid to one column.

### CSS ordering constraint

`global.css` puts its `@media` blocks at lines 756 and 811, ahead of the
page-specific rules near the end of the file. Any base rule for
`.catalog-layout`, `.category-list` or `.category-link` therefore has to be
declared **before** those media queries — otherwise it wins on source order at
equal specificity and the responsive overrides silently do nothing. The new
block is placed directly above the `980px` query with a comment saying so.

Because `.catalog-layout .product-grid` (specificity 0,2,0) outranks the bare
`.product-grid` rules inside both media queries (0,1,0), each query also needs
its own `.catalog-layout .product-grid` override: 2 columns at `980px`, 1 column
at `640px`.

## Unchanged

Filtering behaviour stays exactly as it is today:

- `useEffect` on `[categoryId, search]` calls `api.products(0, false, search || undefined)`
- Category filtering remains client-side via
  `items.filter(item => item.category?.id === Number(categoryId))`
- `categoryId` remains a `string` with `''` meaning "all", so the existing
  comparison and the empty-string check keep working

Only the controls that write to `search` and `categoryId` change shape.

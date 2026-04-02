---
name: ExpenseFlow Design System Tokens
description: Approved color tokens, typography scale, spacing conventions, and component sizing for ExpenseFlow
type: project
---

Design system established during the March 2026 UI refresh. Based on enterprise-grade patterns (SAP Concur, Workday aesthetic). Rebranded to Citipost identity March 2026.

## Brand

**Brand:** Citipost — bold red on white. CSS variable `--primary: 0 79% 44%` = `#CC1719`.

## Color Tokens (Tailwind classes)

**Primary action:** red-700 (#CC1719 / HSL 0 79% 44%) — used for CTAs, active nav, focus rings, unread badges, loading spinners, chart bar fill
**Page background:** gray-50
**Card/surface:** white, border border-gray-200
**Table header background:** bg-gray-50
**Row dividers:** divide-gray-100 / border-gray-100

**Status badge colors (text-only labels, rectangular rounded not pill):**
- draft: bg-gray-100 text-gray-600
- submitted: bg-blue-50 text-blue-700  ← intentionally blue (semantic, not brand)
- manager_review: bg-amber-50 text-amber-700
- approved: bg-green-50 text-green-700
- audit: bg-purple-50 text-purple-700
- processing: bg-orange-50 text-orange-700
- exported: bg-teal-50 text-teal-700

**Functional alert colors:**
- Error: bg-red-50 border-red-200 text-red-700
- Warning: bg-amber-50 border-amber-200 text-amber-700
- Info: bg-blue-50 border-blue-200 text-blue-700

## Brand-specific class mappings (Citipost rebrand)

When adding new UI elements, use these in place of what blue was:
- Active nav item: bg-red-50 text-red-700
- Focus rings: focus:ring-red-600 focus:border-red-600
- Unread/notification badge: bg-red-700 text-white
- User avatar background: bg-red-100 text-red-700
- Loading spinner: border-t-red-700
- Chart bar fill: #CC1719
- Inline action links (Edit, View, etc.): text-red-700 hover:text-red-800
- Row hover accent text: group-hover:text-red-700
- Selection highlight row: bg-red-50/60
- Timeline active step: bg-red-700 border-red-700 text-red-700
- Batch creation panel: border-red-200 bg-red-50
- Sidebar brand icon: bg-red-700

## Typography Scale (Tailwind)

- Page title (h1): text-xl font-semibold text-gray-900
- Card/section title: text-sm font-semibold text-gray-900
- Table header: text-[11px] font-semibold text-gray-500 uppercase tracking-wide
- Body / row data: text-sm text-gray-900 (primary), text-sm text-gray-600 (secondary)
- Meta / helper: text-xs text-gray-500
- Badge/label text: text-[11px] font-medium

## Component Sizes

- Standard input height: h-9 (36px)
- Button primary: h-10 (default), h-9 (sm)
- Card border-radius: rounded (6px) — NOT rounded-lg
- Border color on cards/inputs: border-gray-200 (cards), border-gray-300 (inputs)
- StatusBadge: rectangular (rounded, not rounded-full), px-2 py-0.5

## Spacing Conventions

- Page content padding: p-8 (max-w-screen-xl)
- Card content padding: px-5 py-4
- Card header padding: px-5 py-4 with border-b border-gray-100
- Table row padding: px-5 py-3.5
- Section spacing: space-y-6 or space-y-7 between major sections
- Row spacing within lists: divide-y divide-gray-100

## Font

Inter (or system-ui fallback). font-feature-settings enabled for numeric tabular figures.
Use tabular-nums on all currency and date values.

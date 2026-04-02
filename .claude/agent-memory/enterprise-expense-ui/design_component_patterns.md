---
name: ExpenseFlow UI Component Patterns
description: Established component patterns and decisions for the ExpenseFlow UI — tables, forms, navigation, empty states
type: project
---

Patterns established during the March 2026 UI refresh.

## Navigation (Layout.jsx)

- Sidebar width: w-60
- Brand area: 56px (h-14) fixed height, blue-600 icon mark + "ExpenseFlow" text
- Nav items: text-sm, gap-2.5, rounded (not rounded-md), active = bg-blue-50 text-blue-700 font-medium
- Notification badge: rectangular (rounded), blue-600, not red — only turns red if urgent
- User footer: avatar with initials (blue-100/blue-700), name + role label, logout icon button
- Role display labels: employee="Employee", manager="Manager", processor="Finance Processor", admin="Administrator"

## Page Headers

Standard pattern for all pages:
```
<h1 className="text-xl font-semibold text-gray-900">Page Title</h1>
<p className="text-sm text-gray-500 mt-0.5">Subtitle / count</p>
```
Primary action (e.g. "New Claim") right-aligned, Button size="sm".

## Data Tables

Prefer structured table layout over list cards. Pattern:
- Container: border border-gray-200 rounded bg-white overflow-hidden
- Header row: bg-gray-50 border-b border-gray-200, text-[11px] font-semibold text-gray-500 uppercase tracking-wide
- Data rows: divide-y divide-gray-100, px-5 py-3.5, hover:bg-gray-50
- Clickable rows use <Link> with group class for hover effects on title (group-hover:text-blue-700)
- Fixed widths on secondary columns (w-28, w-36 etc.) to maintain alignment
- Amount values: tabular-nums, text-right

## Cards

- Use Card only for grouped content blocks, not as list items
- CardHeader: border-b border-gray-100, contains CardTitle (text-sm font-semibold)
- CardContent: px-5 py-4 (overriding default pt-0)
- No shadow (shadow-none) — rely on border for definition

## Empty States

Standard empty state pattern (no card wrapper):
```
<div className="flex flex-col items-center justify-center py-16 text-center border border-gray-200 rounded bg-white">
  <p className="text-sm font-medium text-gray-700">Primary message.</p>
  <p className="text-sm text-gray-500 mt-1">Secondary guidance.</p>
</div>
```

## Loading States

All pages use the same spinner: `animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600`
Centered in h-40 container.

## Action Panels (Approval/Audit)

Used in ClaimDetail for manager and finance actions:
- Wrap in Card with CardHeader (title) + CardContent
- Brief explanatory sentence above textarea
- Textarea for comment, then action buttons
- Destructive variant buttons use: `text-red-600 border-red-200 hover:bg-red-50`

## Alert Banners

Inline banners (not toasts) for errors/warnings:
- Error: flex items-start gap-2, bg-red-50 border-red-200, AlertCircle icon
- Warning: bg-amber-50 border-amber-200, AlertTriangle icon
- Info/action callout: bg-blue-50/amber-50/purple-50 with border, ArrowRight chevron

## Status Timeline

Horizontal stepper in ClaimDetail. w-7 h-7 nodes, w-10 connector lines, text-[11px] labels.
Done = green-500 with Check icon, Active = blue-600 with dot, Upcoming = gray-300 with dot.

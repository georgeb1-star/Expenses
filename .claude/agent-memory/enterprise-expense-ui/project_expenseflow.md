---
name: ExpenseFlow Project Overview
description: Core facts about the ExpenseFlow enterprise expense management system — stack, structure, and purpose
type: project
---

ExpenseFlow is a full-stack enterprise expense management system at C:\Users\GBunton\Documents\Expenses. It is modeled on SAP Concur/Workday-style internal tools.

**Why:** Internal business tool for tracking employee expense claims through an approval workflow (draft → submitted → manager_review → approved → audit → processing → exported).

**Stack:**
- Frontend: React + Vite, Tailwind CSS, shadcn-style component library (custom), Recharts for charts, Lucide for icons
- Backend: Node.js/Express (in /server), PostgreSQL database
- Auth: JWT tokens stored in localStorage
- Routing: React Router v6

**Roles:** employee, manager, processor (Finance), admin
- Employees create and submit claims
- Managers approve/reject claims at manager_review stage
- Processors (Finance) run audit and batch claims for export
- Admin has all access

**Key pages:** Dashboard, Claims (list + detail), Approvals, Finance, Batches, Notifications

**How to apply:** When adding new features, follow this role/workflow model. The audit trail and batch export flow are core financial compliance features — treat them with appropriate care.

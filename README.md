# ExpenseFlow

Enterprise expense management system — a simplified Concur alternative.

## Quick Start

### Option A: Docker Compose (recommended)

```bash
# 1. Copy env file
cp .env.example server/.env

# 2. Start everything
docker compose up

# 3. In a separate terminal, run migrations + seed
docker compose exec server npm run migrate
docker compose exec server npm run seed
```

App runs at:
- Frontend: http://localhost:5173
- API: http://localhost:3001

### Option B: Local (no Docker)

**Requirements:** Node 18+, PostgreSQL 14+

```bash
# 1. Start PostgreSQL and create database
psql -U postgres -c "CREATE USER expenses WITH PASSWORD 'expenses_dev';"
psql -U postgres -c "CREATE DATABASE expenses OWNER expenses;"

# 2. Server setup
cd server
cp ../.env.example .env   # Edit DATABASE_URL if needed
npm install
npm run migrate
npm run seed
npm run dev

# 3. Client setup (new terminal)
cd client
npm install
npm run dev
```

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| employee@example.com | password | Employee |
| manager@example.com | password | Manager |
| processor@example.com | password | Processor |
| admin@example.com | password | Admin |

## Workflow

```
Draft → Submitted → Manager Review → Approved → Audit → Processing → Exported
```

1. **Employee** creates a claim, adds items (expense or mileage), uploads receipts, submits
2. **Manager** reviews, approves or sends back with comment
3. **Processor** selects approved claims, creates a batch, exports CSV for Sage
4. Each transition is logged in the audit trail

## Mileage Rates

- First 10,000 miles per tax year: £0.45/mile
- Over 10,000 miles: £0.25/mile
- Tax year runs April 6 → April 5

## CSV Export Fields

`employee_id, claim_id, item_id, expense_type, date, description, net_amount, vat, total, currency, department, project_code, billable, batch_id`

## Deployment to Railway

1. Push to GitHub
2. Create Railway project → "Deploy from GitHub repo"
3. Add PostgreSQL plugin
4. Set env vars: `DATABASE_URL` (auto-set by Railway), `JWT_SECRET`, `NODE_ENV=production`
5. Set root directory to `server` for the backend service
6. Add a second service for `client`, set root to `client`, build command `npm run build`, serve with Railway static hosting

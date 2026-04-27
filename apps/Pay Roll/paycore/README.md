# PayCore — Payroll Application

Live: https://paycore-app.web.app

PayCore is a payroll management application built with Ionic + Angular on the frontend and Supabase as the backend, deployed via Firebase Hosting.

---

## Tech Stack

- **Frontend:** Ionic 8 + Angular 20
- **Backend:** Supabase (PostgreSQL + REST)
- **Hosting:** Firebase Hosting
- **Region:** ap-south-1 (Mumbai)

---

## Project Status

All phases complete and deployed.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Scaffold + login + routing | Done |
| 2 | Employee module (Dashboard, Payslip, Profile) | Done |
| 3 | Payroll module (6 tabs) | Done |
| 4 | Admin module (4 tabs) | Done |
| 4b | New Registration flow + sidebar layout refactor | Done |
| 5 | Firebase Hosting deploy | Done |
| 6 | Supabase backend with write-through | Done |

---

## Infrastructure

**Firebase project:** `paycore-app` (hosts the static Angular build)

**Supabase project:** `paycore` (`blfeiczbzcuqedqoctqu`)
- URL: `https://blfeiczbzcuqedqoctqu.supabase.co`
- Anon key: `sb_publishable_oXqgo3T60ssgYWCq65-TQA_Buso88T-`
- Config files: `src/environments/environment.ts` and `environment.prod.ts`

### Database Schema

All tables have RLS enabled with public read/write for the demo.

| Table | Purpose |
|-------|---------|
| `employees` | Employee records with statutory fields (`pf_tag`, `esi_apply`, `pt_apply`, `tax_regime`) |
| `system_users` | Admin / payroll / employee login accounts |
| `holidays` | Company calendar |
| `approvals` | Pending registration / edit / unlock requests |
| `salary_months` | Per-month excluded codes + disbursed + locked flags |
| `disbursements` | History of completed disbursements (`employees` jsonb) |

---

## Architecture

`AppStateService` loads all 6 collections from Supabase on construction.

**Write-through helpers** (all return Promises):
- `addEmployee`, `updateEmployee`
- `addUser`, `toggleUserStatus`
- `addHoliday`, `updateHoliday`, `removeHoliday`
- `addApproval`, `setApprovalStatus`
- `saveSalaryMonth`, `addDisbursement`

The local array is mutated first (optimistic update) and then persisted to Supabase.

`SupabaseService` handles the raw client and mappers (camelCase ↔ snake_case).

---

## Demo Logins

| Role | Username | Password |
|------|----------|----------|
| Employee | `310569` (Rampy Sharma) | `password` |
| Payroll | any (Vikram Patel) | `password` |
| Admin | any (Ananya Singh) | `password` |

---

## Development

```bash
# Install dependencies
npm install

# Run dev server on port 8200
npx ng serve --port 8200

# Production build
npx ng build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Reset Supabase data by re-running the seed migration via the Supabase MCP tool.

---

## Not Yet Implemented

1. Real authentication (currently demo-mode; any password works)
2. Real PDF generation (uses browser print)
3. Excel / CSV export buttons wired to real export
4. Notification / profile drawers (sidebar user card covers profile adequately)
5. File upload for registration docs (currently click-to-mark as uploaded only)

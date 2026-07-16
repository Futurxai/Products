# PayLite — Futurx Payroll & Leave

Ionic Angular port of the reference `Futurx Payroll & Leave` demo (a single-file
HTML/JS mockup). Two roles — Manager and Employee — with account creation,
attendance marking, leave requests/approval, computed payroll, and a monthly
budget allocation vs. payout variance view. All data is stored client-side in
`localStorage`; there is no backend.

This is a separate app from [`../paycore`](../paycore), which implements a
different, larger 3-role (Employee/Payroll/Admin) payroll system with tax
calculations and a Supabase backend.

## Structure

- `src/app/services/app-state.service.ts` — all app state (accounts,
  attendance, leave requests, budget) and business logic, persisted to
  `localStorage`.
- `src/app/pages/role-select`, `login`, `forgot-password` — auth flow.
- `src/app/pages/tabs` — tab shell; `home`, `attendance`, `leave` are visible
  to every account, `review`, `payroll`, `budget` are manager-only (guarded by
  `manager.guard.ts`).

## Quick start

```bash
npm install
npm start        # ng serve, http://localhost:4200
npm run build     # production build to www/
```

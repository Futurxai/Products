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

## Android build

The `android/` folder is a Capacitor-managed native project (appId
`com.futurx.paylite`), added with `npx cap add android`. It needs the Android
SDK and a network path to `dl.google.com` to build — neither is available in
this sandbox, so the native build has only been verified structurally here
(Gradle project configuration resolves; dependency download was not
reachable). On a machine with Android Studio / the SDK installed:

```bash
npm run android:sync   # ng build, then copy web assets + sync native config
npm run android:open   # opens the project in Android Studio
# or, from android/:
./gradlew assembleDebug
```

Re-run `npm run android:sync` after any change to `src/` or
`capacitor.config.ts` so the native project picks up the latest web build.

## Branding (icons & splash screen)

`assets/icon.png`, `assets/icon-foreground.png`, `assets/icon-background.png`,
and `assets/splash.png` are the master brand assets (dark navy `#0A0C12` +
gold `#F2A93B` mark), sized per the
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
convention. Regenerate every density from them with:

```bash
npx @capacitor/assets generate --android
```

That tool depends on `sharp`, whose native binary download was blocked by
this sandbox's network policy, so the checked-in `android/app/src/main/res`
icon/splash PNGs were instead rendered directly per-density (same source
design, exact same target dimensions the tool would produce) — regenerate
them properly with the command above once you're on a machine where
`@capacitor/assets` can install.

## Web hosting (Firebase)

`firebase.json` and `.firebaserc` are set up the same way as the other apps
in this repo (`paycore`, `eatwell-mobile`, `lovedigitally-web`): serve the
`www/` production build as a single-page app.

`.firebaserc` currently points at a placeholder project id, `paylite-app`,
which **does not exist yet** — nobody has created it, and no deploy has been
run from this sandbox (no Firebase credentials are available here). To go
live:

```bash
npm run build                       # produces www/
npx firebase-tools login            # one-time, opens a browser for auth
npx firebase-tools projects:create paylite-app   # or swap in an existing project id
                                     # in .firebaserc if you already have one
npm run deploy                      # ng build + firebase deploy --only hosting
```

After the first deploy, the app will be live at `https://paylite-app.web.app`
(or whatever project id you actually used — update `.firebaserc` to match).

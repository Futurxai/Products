# Operations Runbook — Puzzle Module

What to do when something's wrong in production. For how to deploy in the first place, see `DEPLOYMENT.md` — this document assumes a deploy has already happened and something now needs attention: monitoring, backups, and incident response.

**Honesty note up front**: this is a small, recently-launched app with no formal on-call rotation, no paging system, and no dedicated ops team — this runbook describes the procedures and tools that actually exist today, not an idealized version of them. Where something isn't set up (alerting, backups), it says so plainly rather than describing a process around a tool that isn't there.

## 1. Deployment (summary — see `DEPLOYMENT.md` for the full procedure)

- **Recommended**: Actions tab → **Puzzle Module Deploy** → Run workflow (`workflow_dispatch` only — never automatic on merge, see `docs/puzzle-module/adr/0010-manual-trigger-deploy-workflow.md`).
- **Manual fallback**: Firebase CLI, three independently-deployable pieces (Functions, Rules, Hosting), safe order documented in `DEPLOYMENT.md` → Deployment.
- Every deploy should be preceded by the Release Checklist in `DEPLOYMENT.md` — don't skip it under incident pressure; a rushed deploy during an incident is a common way to make an incident worse.

## 2. Monitoring

### What's already in place, with zero extra setup

Every Cloud Function emits structured JSON logs (`functions/src/config/logger.ts`, wrapping `firebase-functions/logger`) that integrate automatically with **Cloud Logging** and **Cloud Monitoring** the moment they're deployed — invocation counts, error rates, latency percentiles, memory/CPU are all available in the Cloud Console with no configuration. Every log line consistently carries `functionName`, and most carry `experienceId`/`questionId`/`actorUid` — filter by these in Cloud Logging's query builder.

**Useful log queries** (Cloud Console → Logging → Logs Explorer, or `gcloud logging read`):

```
# All activity for one function
resource.type="cloud_run_revision"
jsonPayload.functionName="submitAnswer"

# All activity for one experience, across every function it touched
jsonPayload.experienceId="<experienceId>"

# Every business-rule rejection (expected, not bugs — logged at WARN)
severity="WARNING"
jsonPayload.domainErrorCode!=""

# Only genuine errors/bugs (unhandled exceptions, infra failures)
severity="ERROR"

# One specific domain error code, e.g. spot-checking rate-limiting behavior
jsonPayload.domainErrorCode="RATE_LIMITED"
```

A spike in `severity="ERROR"` (not `WARNING` — business-rule rejections are expected and logged as warnings deliberately, see `functions/src/config/logger.ts`'s `domainRejection`) is the signal worth reacting to; a spike in a specific `domainErrorCode` at `WARNING` severity is usually a *product* signal (e.g. a lot of `RATE_LIMITED` might mean a UI bug causing rapid resubmission, not an attack) rather than an incident by itself.

### What's explicitly NOT configured

- **No custom Cloud Monitoring alerting policies.** Nobody gets paged or emailed automatically for an elevated error rate or latency spike — this requires manual setup in Cloud Console → Monitoring → Alerting, which hasn't been done. Until it is, **monitoring is manual/reactive**: someone needs to think to check Cloud Logging, or a user needs to report a problem.
- **No client-side error monitoring** (Sentry, Crashlytics, or equivalent). A client-side failure that never reaches a Cloud Function (a rendering error, an unhandled exception in the browser) is invisible from the server side entirely — the app's own `ToastHostComponent`/inline error states are the only user-facing signal, and nothing aggregates them for the team.
- **No uptime/synthetic monitoring** on the Hosting URL itself. Firebase Hosting's own status page (https://status.firebase.google.com) is the only signal for "is Firebase itself down," not anything this app runs.

**If you're reading this because you want to close these gaps**: see `M5-DELIVERABLES.md` → Future Enhancement Recommendations #3–4 for the specific next steps already scoped.

## 3. Backups

**There is currently no backup or point-in-time-recovery configured for Firestore or Storage.** This is a known, previously-documented gap (`M5-DELIVERABLES.md` → Known Limitations, `DEPLOYMENT.md` → Rollback Plan), not something this runbook is discovering for the first time — repeated here because it directly shapes incident response for any data-loss scenario (§4.4 below).

- **Firestore**: no scheduled exports, no Point-in-Time Recovery (PITR) enabled. A bad write (a bug, a bad manual edit via the Console) that isn't caught quickly has no automated undo.
- **Storage**: no object versioning enabled on the bucket. An overwritten or deleted Storage object (a reveal image, a piece slice) cannot be recovered once overwritten/deleted.
- **Code**: fully recoverable via git — this is not a gap; every deployed version corresponds to a real commit.

**If a real incident ever requires data recovery and there's no backup to restore from**, manual correction via the Firebase Console or a one-off Admin SDK script is the only option — see §4.4.

## 4. Incident response

### 4.1 Elevated error rate on a specific Cloud Function

1. Cloud Logging: filter `severity="ERROR"` + `jsonPayload.functionName="<function>"`, sorted by time — read the actual stack traces, don't guess.
2. Check the Cloud Functions dashboard (Console → Functions → the specific function) for a correlated spike in latency or memory — often a symptom of the same root cause (e.g. a downstream Firestore/Storage slowdown) rather than a bug in this codebase.
3. If the error is a genuine bug in a recent deploy: **roll back that piece** (see `DEPLOYMENT.md` → Rollback Plan → Cloud Functions) rather than trying to hot-fix under pressure. Redeploying the previous known-good commit is faster and safer than debugging live.
4. If the error is NOT from a recent deploy (a pre-existing bug, or a downstream Firebase/GCP issue): check https://status.firebase.google.com first — if Firebase itself is degraded, there's nothing to fix on this end; monitor and wait. Otherwise, treat as a normal bug: reproduce locally against the emulator suite (§ below) before attempting a fix.

### 4.2 A bad deploy (Hosting, Functions, or Rules)

Follow `DEPLOYMENT.md` → Rollback Plan exactly — it's written per-piece (Hosting is instant via `hosting:clone`, Functions/Rules require redeploying a previous commit and take a few minutes). **Rules rollbacks are the highest-blast-radius case** — they're shared with `lovedigitally-web` (see `docs/puzzle-module/adr/0007-shared-rules-file-via-symlink.md`); confirm with whoever owns that app's deploys before rolling back Rules alone if there's any chance the bad Rules change also affected it.

After any rollback: re-run the smoke test from `DEPLOYMENT.md`'s Release Checklist, and read the Cloud Logging trail for what actually broke — a rollback buys time, it doesn't diagnose the root cause.

### 4.3 Suspected credential/secret leak

(A `FIREBASE_SERVICE_ACCOUNT_KEY` or Web SDK key accidentally committed, logged, or exposed.)

1. **Web SDK config (`FIREBASE_API_KEY` etc.) is not a secret by Firebase's own design** — it's safe to ship client-side, and its exposure alone is not an incident. Don't rotate it reflexively; confirm what actually leaked first.
2. **The service account key (`FIREBASE_SERVICE_ACCOUNT_KEY`) is a real secret.** If it leaked: revoke/delete the compromised service account key immediately in GCP Console → IAM & Admin → Service Accounts, generate a new one, and update the `FIREBASE_SERVICE_ACCOUNT_KEY` GitHub Actions repository secret. The deploy workflow will fail until this is done — that's the correct state, not a bug, until the new key is in place.
3. Check Cloud Logging / GCP Audit Logs for any activity from the compromised key's identity in the window it may have been exposed, to assess whether it was actually used maliciously, not just exposed.
4. If any Recipient share tokens may have been exposed alongside real data (unlikely given tokens are never logged, see `DEPLOYMENT.md` → Logging Review — but verify, don't assume): there's no bulk-revoke mechanism for share tokens today; affected experiences would need individual manual intervention (see §4.4's manual-correction approach) — flag as a gap if it's ever actually needed, don't build one preemptively.

### 4.4 Data-loss / bad-write incident (no automated recovery exists — see §3)

1. Identify the exact scope: which documents/objects, over what time window, via Cloud Logging (`jsonPayload.experienceId`, timestamps) and/or Firestore's own audit trail if enabled.
2. If the bad write is still recent and the correct prior value is knowable (e.g. from a Cloud Logging entry that recorded the previous state, or from the Creator/Recipient's own memory of what should be there): manually correct via the Firebase Console or a one-off Admin SDK script, scoped as narrowly as possible to the affected document(s).
3. If the correct prior value is not recoverable at all: this is a real, unrecoverable data-loss incident given the current lack of backups (§3). Communicate honestly with the affected Creator/Recipient rather than guessing at a fix that might make it worse.
4. **After any such incident**: treat enabling Firestore PITR / scheduled exports as a direct, concrete follow-up, not a someday-nice-to-have — this is precisely the scenario §3 exists to warn about.

### 4.5 Abuse (rate-limit bypass, credential stuffing on Creator auth, share-token brute-forcing)

- `submitAnswer` already rate-limits repeated wrong attempts per question (`RATE_LIMITED`, see `docs/puzzle-module/CLOUD-FUNCTIONS-API.md`) — a spike in this specific code at the per-experience level is expected user behavior (someone genuinely stuck), not abuse; a spike distributed across many different experiences from a small number of source identities is the actual abuse signal, visible via Cloud Logging's `actorUid`/IP-adjacent fields if Cloud Functions v2's request logging is consulted alongside the application-level logs.
- Share tokens are 192-bit cryptographically random (`docs/puzzle-module/adr/0005-anonymous-recipient-identity.md`) — brute-forcing one is not realistically feasible; a burst of `TOKEN_NOT_FOUND` responses is far more likely a broken/mistyped link being retried than an actual guessing attack, but if it's ever genuinely suspected, Cloud Functions' own request-level logs (not just this app's `jsonPayload`) are the place to look for a distributed pattern.
- Firebase Auth's own built-in abuse protection (App Check is **not currently enabled** — visible in Functions logs as `"verifications":{"app":"MISSING"}` on every request, a known, accepted gap, not a new finding) covers some baseline credential-stuffing protection at the platform level regardless of anything in this app's own code.

## 5. Escalation

There is no formal on-call rotation or escalation policy defined for this project today. Until one exists: whoever notices an incident (via a user report or manually checking Cloud Logging, since §2 has no automated alerting) is responsible for triaging using this runbook and, if a rollback or deploy is needed, following `DEPLOYMENT.md`. If this gap needs closing before it's actually exercised by a real incident, that's a team/process decision, not something this document can resolve unilaterally.

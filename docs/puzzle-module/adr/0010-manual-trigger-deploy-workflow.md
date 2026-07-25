# 0010. Manual-trigger (`workflow_dispatch`) deploy workflow, not deploy-on-merge

## Status

Accepted (Final Pre-Launch Tasks, pre-v1.0.0). Revisit per `PLATFORM-ARCHITECTURE.md` §9's module-lifecycle framing and Future Enhancement Recommendation #1 in `M5-DELIVERABLES.md` — this is deliberately not the final word on CD for this app.

## Context

CI (`.github/workflows/puzzle-module-ci.yml`) validates every push/PR — lint, unit tests, production build, real-emulator integration tests — but had no deploy step at all through the end of M5; every release was a fully manual CLI process. Before tagging v1.0.0, a deploy path needed to exist. The two realistic shapes: automatic deploy on every merge to `main`, or a workflow that exists but only runs when a human explicitly triggers it.

## Decision

`.github/workflows/puzzle-module-deploy.yml` — `workflow_dispatch` only, with a `deploy_target` choice input (`all`/`hosting-only`/`functions-only`/`rules-only`). It never runs on `push` or `pull_request`. A merge to `main` deploys nothing by itself; deploying requires someone to go to the Actions tab and explicitly run it.

## Consequences

- **No accidental production deploy from a merge.** For a first release of a product whose Rules changes have platform-wide blast radius ([ADR-0007](0007-shared-rules-file-via-symlink.md)), the ability to merge code without that merge being simultaneously a production deploy decision was judged more valuable than deploy velocity.
- **A deploy is always a deliberate, attributable action** — whoever ran the workflow, and when, is directly visible in the Actions run history, rather than inferred from a merge commit's author (who may not be the person who intended to ship right now).
- **Real secrets never touch a human's terminal.** The workflow reads `FIREBASE_API_KEY`/`FIREBASE_SENDER_ID`/`FIREBASE_APP_ID`/`FIREBASE_SERVICE_ACCOUNT_KEY` from GitHub Actions repository secrets — nobody, including whoever triggers the workflow, ever sees the raw values, since GitHub redacts secret values from logs automatically. This was true regardless of trigger type, but is called out here because it was designed alongside this decision, not before it.
- **The direct cost: shipping a fix requires a second, manual action after merge**, not just a merge. Accepted for v1.0.0's launch; `M5-DELIVERABLES.md`'s Future Enhancement Recommendation #1 explicitly proposes automating this workflow on merge-to-`main` later, with appropriate approval gates (a GitHub Environment with required reviewers is already supported by this workflow's `environment: production` targeting, just not configured yet) — this ADR records the *current* trade-off, not a permanent one.

## Alternatives considered

- **Deploy automatically on every merge to `main`, gated by a required-reviewers Environment.** Considered, and likely the right eventual shape per the Future Enhancement Recommendation above — deferred for v1.0.0 specifically because no Environment protection rule was configured yet, and shipping automatic deploys without that gate already in place would have meant the first real deploy trigger was "someone merged a PR," with no deliberate step in between, before the team had exercised the manual path even once.

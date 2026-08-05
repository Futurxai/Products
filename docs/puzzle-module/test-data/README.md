# Puzzle Module — Test Data (Phase 3)

Realistic, production-shaped dummy data for the Puzzle Module, generated against the approved **PRD** and **Module Contract**. Everything here is directly seedable into a Firebase emulator or consumable as static mocks for UI development — no application code included, per the phase instructions.

## Files

| File | Contents |
|---|---|
| `01-creators.json` | 9 creator (Firebase Auth) accounts |
| `02-recipients.json` | 10 recipient display profiles (reference-only — recipients have no real accounts, per Business Rule #7) |
| `03-puzzle-experiences.json` | **10 complete puzzle experiences** — full authoring content: 9 questions/answers/variants/clues each, welcome note, completion message, partner-help challenge |
| `04-progress-examples.json` | Recipient progress documents across every lifecycle status (in_progress, completed, archived) + explicit notes on which experiences have no progress doc yet |
| `05-score-reward-examples.json` | The scoring table, feedback-tier messages, star thresholds, and worked/boundary calculations tied to the data above |
| `06-analytics-events.json` | ~36 sample event-log entries matching the Module Contract's event envelope, including a full creator-to-completion lifecycle for one experience |
| `07-firestore-documents-examples.json` | How 2 experiences map onto real Firestore collections, demonstrating the public/private data split required by the security boundary |
| `08-storage-structure.md` | Firebase Storage path conventions + example paths for all 10 experiences |
| `09-cloud-function-examples.md` | Request/response payloads for every Cloud Function implied by the Contract (publish, resolve token, submit answer, request clue, partner-help reveal, completion summary) |
| `images/` | 10 SVG placeholder reveal-images (one per experience) + 1 shared locked-piece pattern SVG — all valid, lightweight, swappable with real photos later |

## The 10 sample experiences

| ID | Occasion | Creator → Recipient | Status |
|---|---|---|---|
| exp_001 | Anniversary | Vikram → Ananya | completed (3★, 800/900) |
| exp_002 | Birthday | Arjun → Priya | in_progress (5/9 pieces) |
| exp_003 | Proposal | Rohan → Meera | published, not opened yet |
| exp_004 | Wedding | Kabir → Sana | draft |
| exp_005 | Friendship | Neha → Ishita | completed (2★, 615/900) |
| exp_006 | Baby | Rahul → Divya | in_progress (2/9 pieces) |
| exp_007 | Graduation | Sneha → Aditya | published, not opened yet |
| exp_008 | Long Distance | Karan → Alisha | completed (3★, 900/900 — perfect run) |
| exp_009 | Family | Meera → Rajesh | archived (completed, 3★, 860/900) |
| exp_010 | Birthday (milestone 30th) | Ananya → Zoya | draft |

This covers all 9 PRD occasion types plus one bonus Birthday variant (as required — "at least 10"), and deliberately spans every lifecycle status (`draft`, `published`, `in_progress`, `completed`, `archived`) so every screen/state in Phase 4's UI has real data to render against.

## Design notes worth knowing before Phase 4/5

- **Security boundary modeled, not just described**: `07-firestore-documents-examples.json` physically separates what a client can read (`puzzle_experiences`) from what only a Cloud Function can read (`puzzle_experiences_private` — correct answers, clue text, real reveal image path). This isn't just documentation; UI mocks should be built against the *public* shape only, to keep the eventual real implementation honest.
- **Collection naming is namespaced** (`puzzle_*`) per the Module Contract's extensibility convention, so this data model won't collide with anything a future host platform already has (e.g. the unrelated `lovedigitally_*` collections in `/lovedigitally-web`, discovered during Phase 1).
- **Images are placeholders, not real photos** — deliberately: inventing fake "personal" photos of named individuals felt wrong even as test data. The SVGs are distinct per occasion (color, icon, names) so every UI state still looks and feels different in dev, and are trivially swappable for the real Storage-backed pipeline described in `08-storage-structure.md`.
- **Scoring is fully worked out**: `05-score-reward-examples.json` includes boundary test cases (799 vs 800, 0 vs 90 points) specifically so QA has ready-made edge cases for the star-rating logic without having to construct them by hand.
- **exp_001's score lands exactly on the 3-star threshold (800)** and **exp_010's creator (`cre_001b`) is the same person as exp_001's recipient** — both intentional, to give dev/QA realistic "edge of boundary" and "one person, multiple roles" fixtures without extra effort later.

## Not included here (by design)

- Any actual application/Cloud Function code — this is data and interface contracts only, per the phase instructions.
- A resolved decision on which Firebase project these collections will ultimately live in — that's still open pending the host-platform decision flagged in Phase 1, and will be finalized in Phase 5 (Technical Architecture).

---

Waiting for approval before Phase 4 (UI/UX Design).

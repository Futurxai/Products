# Cloud Function Request/Response Examples — Puzzle Module

These are illustrative payload contracts for the callable functions implied by the Module Contract's security boundary (§8: all answer validation, reveal-gating, and token generation happen server-side). Function names/shapes are a draft for Phase 5 (Technical Architecture) to formalize — provided now so UI development can mock against a stable interface immediately.

---

## `publishExperience`

**Request** (creator, authenticated)
```json
{ "experienceId": "exp_004" }
```

**Response — success**
```json
{
  "ok": true,
  "shareToken": "pzl_5c2f70a1e9d43b86",
  "shareUrl": "https://puzzle.lovedigitally.app/e/pzl_5c2f70a1e9d43b86",
  "status": "published"
}
```

**Response — validation failure**
```json
{
  "ok": false,
  "error": "INCOMPLETE_EXPERIENCE",
  "message": "3 of 9 questions are missing a correct answer.",
  "missingFields": ["questions.q6.correctAnswer", "questions.q7.correctAnswer", "revealImage"]
}
```

---

## `resolveShareToken`

**Request** (recipient, unauthenticated)
```json
{ "shareToken": "pzl_7f1c9ad2b6e34a08" }
```

**Response — success**
```json
{
  "ok": true,
  "experienceId": "exp_001",
  "sessionRef": "sess_9c1a4e2b7f036d58",
  "publicMeta": {
    "occasion": "Anniversary",
    "emotion": "Nostalgia",
    "recipientDisplayName": "Ananya",
    "welcomeNote": "Hey Annie, three years ago today I promised to make every day feel like this one...",
    "status": "completed",
    "lockedPatternImageUrl": "https://storage.googleapis.com/.../frame-outline.svg"
  }
}
```

**Response — invalid/expired token**
```json
{ "ok": false, "error": "TOKEN_NOT_FOUND", "message": "This link is invalid or has expired." }
```

---

## `submitAnswer`

**Request** (recipient, session-scoped via `sessionRef`)
```json
{
  "sessionRef": "sess_9c1a4e2b7f036d58",
  "questionIndex": "q3",
  "answer": "fishermans wharf"
}
```

**Response — correct**
```json
{
  "ok": true,
  "correct": true,
  "questionIndex": "q3",
  "cluesUsed": 1,
  "earnedVia": "clue",
  "pointsAwarded": 75,
  "feedbackTier": "nudge_to_remember",
  "feedbackMessage": "Needed a little nudge, but you got there!",
  "pieceImageUrl": "https://storage.googleapis.com/.../reveal-image-slice-q3.jpg",
  "piecesUnlocked": 3,
  "piecesRemaining": 6
}
```

**Response — incorrect**
```json
{
  "ok": true,
  "correct": false,
  "questionIndex": "q3",
  "attemptNumber": 1,
  "clueAvailable": true,
  "cluesUsedSoFar": 0
}
```

**Response — incorrect, all clues exhausted**
```json
{
  "ok": true,
  "correct": false,
  "questionIndex": "q5",
  "attemptNumber": 4,
  "clueAvailable": false,
  "cluesUsedSoFar": 3,
  "partnerHelpAvailable": true
}
```

---

## `requestClue`

**Request**
```json
{ "sessionRef": "sess_9c1a4e2b7f036d58", "questionIndex": "q4" }
```

**Response**
```json
{
  "ok": true,
  "questionIndex": "q4",
  "clueNumber": 2,
  "clueText": "It's a brewery.",
  "clueNumbersRemaining": 1
}
```

**Response — no clues left**
```json
{ "ok": false, "error": "NO_CLUES_REMAINING", "message": "All 3 clues have already been used for this question." }
```

---

## `requestPartnerHelpReveal`

**Request** — called after the recipient has invoked "Ask Your Partner" and returns to the app to tap "Reveal Piece"
```json
{ "sessionRef": "sess_9c1a4e2b7f036d58", "questionIndex": "q5" }
```

**Response — success**
```json
{
  "ok": true,
  "questionIndex": "q5",
  "earnedVia": "partner_help",
  "pointsAwarded": 10,
  "feedbackTier": "teasing_inside_jokes",
  "feedbackMessage": "Had to phone a friend, huh? 😏",
  "pieceImageUrl": "https://storage.googleapis.com/.../reveal-image-slice-q5.jpg",
  "piecesUnlocked": 5,
  "piecesRemaining": 4
}
```

**Response — clues not yet exhausted (guards against skipping the clue path)**
```json
{ "ok": false, "error": "CLUES_NOT_EXHAUSTED", "message": "Use all 3 clues before requesting partner help.", "cluesUsedSoFar": 1 }
```

---

## `getCompletionSummary`

**Request** — called once all 9 pieces are unlocked, to fetch the gated final reveal
```json
{ "sessionRef": "sess_9c1a4e2b7f036d58" }
```

**Response**
```json
{
  "ok": true,
  "finalScore": 800,
  "maxScore": 900,
  "starRating": 3,
  "starLabel": "You know them by heart",
  "completionMessage": "You remembered every single one — of course you did. Happy anniversary, my love. Here's to the fourth year, and every one after it.",
  "finalRevealImageUrl": "https://storage.googleapis.com/.../reveal-image.jpg",
  "perQuestionBreakdown": [
    { "questionIndex": "q1", "earnedVia": "direct", "pointsAwarded": 100 },
    { "questionIndex": "q2", "earnedVia": "direct", "pointsAwarded": 100 },
    { "questionIndex": "q3", "earnedVia": "clue", "pointsAwarded": 75 }
  ]
}
```

**Response — called before completion (guarded)**
```json
{ "ok": false, "error": "NOT_YET_COMPLETED", "message": "4 pieces remaining.", "piecesRemaining": 4 }
```

---

## Common error shape

All functions share a consistent error envelope so the client needs one error-handling path:

```json
{ "ok": false, "error": "ERROR_CODE", "message": "Human-readable explanation.", "details": {} }
```

Known error codes so far: `TOKEN_NOT_FOUND`, `INCOMPLETE_EXPERIENCE`, `NO_CLUES_REMAINING`, `CLUES_NOT_EXHAUSTED`, `NOT_YET_COMPLETED`, `RATE_LIMITED`, `UNAUTHORIZED`, `EXPERIENCE_ALREADY_STARTED` (returned by an edit attempt once Business Rule #10 applies).

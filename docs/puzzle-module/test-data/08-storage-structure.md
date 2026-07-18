# Firebase Storage Structure — Puzzle Module

Per the Module Contract (§5 Integration Points), the module owns a fully namespaced Storage path so it can never collide with another module's assets, regardless of which host platform it's eventually embedded in.

## Path convention

```
puzzle-module/
  _shared/
    patterns/
      frame-outline.svg          ← generic locked-piece placeholder (used by every experience until pieces are earned)
      dotted-outline.svg         ← alternate pattern option for future creator choice
      confetti-cartoon.svg       ← alternate pattern option for future creator choice
  {creatorId}/
    {experienceId}/
      reveal-image-original.jpg  ← as uploaded by the creator, unprocessed
      reveal-image.jpg           ← server-resized/compressed version actually served (Cloud Function on upload trigger)
      reveal-image-slice-q1.jpg  ← q1's crop of the 3x3 grid (generated server-side at publish time)
      reveal-image-slice-q2.jpg
      ...
      reveal-image-slice-q9.jpg
```

Slicing the reveal image into 9 pre-cropped pieces **server-side at publish time** (rather than shipping the full image and cropping client-side with CSS) is what makes the security boundary in the Module Contract actually enforceable: the client can only ever download `reveal-image-slice-qN.jpg` for a piece it has already earned, because the download URL for each slice is only handed out by the `submitAnswer` / `requestPartnerHelpReveal` Cloud Functions on success. `reveal-image.jpg` (the full assembled image) is never downloadable by the client until `puzzle.completed`.

## Example paths for the 10 sample experiences

| Experience | Creator | Path |
|---|---|---|
| exp_001 — Anniversary | cre_001 | `puzzle-module/cre_001/exp_001/reveal-image.jpg` |
| exp_002 — Birthday | cre_002 | `puzzle-module/cre_002/exp_002/reveal-image.jpg` |
| exp_003 — Proposal | cre_003 | `puzzle-module/cre_003/exp_003/reveal-image.jpg` |
| exp_004 — Wedding | cre_004 | `puzzle-module/cre_004/exp_004/reveal-image.jpg` |
| exp_005 — Friendship | cre_005 | `puzzle-module/cre_005/exp_005/reveal-image.jpg` |
| exp_006 — Baby | cre_006 | `puzzle-module/cre_006/exp_006/reveal-image.jpg` |
| exp_007 — Graduation | cre_007 | `puzzle-module/cre_007/exp_007/reveal-image.jpg` |
| exp_008 — Long Distance | cre_008 | `puzzle-module/cre_008/exp_008/reveal-image.jpg` |
| exp_009 — Family | cre_009 | `puzzle-module/cre_009/exp_009/reveal-image.jpg` |
| exp_010 — Birthday (milestone) | cre_001b | `puzzle-module/cre_001b/exp_010/reveal-image.jpg` |

> Sample dev/test images actually provided in this package are SVG placeholders in `images/` (`exp_001-reveal.svg` … `exp_010-reveal.svg`, plus `locked-pattern-frame.svg`) — see the README for how they map to these Storage paths in a seeded emulator.

## Access rules (summary — full rules are a Phase 5 deliverable)

- `puzzle-module/{creatorId}/**` — write access only for the authenticated creator matching `{creatorId}`; the 9 numbered slice files and the full `reveal-image.jpg` are **not** publicly readable — they are served only via signed URLs minted by Cloud Functions after the relevant gameplay condition is met.
- `puzzle-module/_shared/patterns/**` — publicly readable (no sensitive content), not writable by any client.
- Max upload size enforced client-side and re-validated server-side (recommended: 10MB, JPEG/PNG/WebP only).

## Related tasks

- Cloud Function `publishExperience` is responsible for triggering the server-side slicing job before setting `status: "published"`.
- A cleanup job (future work, not MVP) should remove Storage assets when an experience is deleted (not just archived — archived experiences retain assets per the retention policy in the PRD).

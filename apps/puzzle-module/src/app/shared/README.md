# shared/

Small, dumb, reusable presentation components with no knowledge of the domain. If a component needs an injected facade or knows what a "puzzle experience" is, it belongs in `features/`, not here.

- `button/` — `ButtonComponent` (`app-button`), a thin wrapper over `ion-button` with the product's own variant vocabulary (`primary`/`secondary`/`ghost`/`danger`) and a built-in `loading` state.
- `input/` — `InputComponent` (`app-input`), a `ControlValueAccessor` wrapping `ion-input` — label/error/hint handled once, drops into Reactive Forms like a native control.
- `card/` — `CardComponent` (`app-card`), a plain elevated surface (radius/shadow/padding tokens).
- `toast/` — `ToastService` (signal-based queue) + `ToastHostComponent` (`app-toast-host`, mounted once in `AppComponent`).
- `loader/` — `LoaderComponent` (`app-loader`), page/section-level loading indicator (distinct from `ButtonComponent`'s own inline spinner).
- `badge/` — `BadgeComponent` (`app-badge`), a status pill. Generic on purpose — takes a `tone` + projected text, not e.g. an `ExperienceStatus`; mapping a domain status to a tone/label is a `features/` concern.
- `avatar/` — `AvatarComponent` (`app-avatar`), a profile picture with an initials fallback. Takes `name`/`imageUrl`, not a `Creator`.
- `empty-state/` — `EmptyStateComponent` (`app-empty-state`), a "nothing here yet" block with a projected call-to-action.
- `textarea/` — `TextareaComponent` (`app-textarea`), the multi-line counterpart to `InputComponent` — same `ControlValueAccessor`/label/error/hint shape, wrapping `ion-textarea` instead of `ion-input`.
- `stepper/` — `StepperComponent` (`app-stepper`), a generic step indicator — takes `{id, label}` steps and a completed-id set, not a `WizardStepId`; mapping the Wizard's domain steps onto it is a `features/` concern.
- `progress-bar/` — `ProgressBarComponent` (`app-progress-bar`), wraps `ion-progress-bar` with a `value`/`max` pair instead of Ionic's raw 0–1 fraction.
- `modal/` — `ModalComponent` (`app-modal`, M3 Feature 4), a generic overlay wrapping `ion-modal` — `isOpen`/`dismissible`/`label` inputs, a `closed` output, projected content for header/body/footer. Its first real consumer is the Puzzle Preview's Question modal. The Wizard's one confirmation ("leave without saving?") still uses a native `window.confirm` (see `core/guards/wizard-unsaved-changes.guard.ts`) rather than this — that one's a single yes/no prompt with nothing to project, so the extra overlay machinery wasn't worth it there.
- `qr-code/` — `QrCodeComponent` (`app-qr-code`, M3 Feature 5), takes a `data` string and renders it as a QR code image entirely client-side via the `qrcode` npm package (canvas/data-URI generation, no network call) — a share link carries a secure token, so it must never round-trip through a third-party "QR image API" to be rendered.

Added incrementally as `features/` components need them, starting Milestone M3.

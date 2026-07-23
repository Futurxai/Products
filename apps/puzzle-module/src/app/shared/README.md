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

`modal`/`dialog` are still not built — the Wizard's one confirmation ("leave without saving?") uses a native `window.confirm` instead (see `core/guards/wizard-unsaved-changes.guard.ts`), so there's still no real consumer forcing that design work yet.

Added incrementally as `features/` components need them, starting Milestone M3.

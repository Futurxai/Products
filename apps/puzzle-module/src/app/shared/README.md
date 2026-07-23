# shared/

Small, dumb, reusable presentation components with no knowledge of the domain. If a component needs an injected facade or knows what a "puzzle experience" is, it belongs in `features/`, not here.

- `button/` — `ButtonComponent` (`app-button`), a thin wrapper over `ion-button` with the product's own variant vocabulary (`primary`/`secondary`/`ghost`/`danger`) and a built-in `loading` state.
- `input/` — `InputComponent` (`app-input`), a `ControlValueAccessor` wrapping `ion-input` — label/error/hint handled once, drops into Reactive Forms like a native control.
- `card/` — `CardComponent` (`app-card`), a plain elevated surface (radius/shadow/padding tokens).
- `toast/` — `ToastService` (signal-based queue) + `ToastHostComponent` (`app-toast-host`, mounted once in `AppComponent`).
- `loader/` — `LoaderComponent` (`app-loader`), page/section-level loading indicator (distinct from `ButtonComponent`'s own inline spinner).

The rest of the Phase 4 component set (`text-area`, `modal`, `dialog`, `stepper`, `progress-bar`, `avatar`, `badge`, `empty-state`) is added incrementally as the feature that actually needs it lands (Wizard → stepper/modal/progress-bar, Dashboard → badge/avatar/empty-state, …) rather than built speculatively ahead of any consumer.

Added incrementally as `features/` components need them, starting Milestone M3.

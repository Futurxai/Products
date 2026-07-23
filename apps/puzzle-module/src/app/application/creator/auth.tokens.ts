import { InjectionToken } from '@angular/core';
import { AuthPort } from '@domain/ports/auth.port';
import { CreatorRepositoryPort } from '@domain/ports/creator-repository.port';

/**
 * DI tokens for the two auth-related ports. Interfaces have no runtime
 * representation, so Angular needs an `InjectionToken` to bind one to a
 * concrete implementation. Defined here (application/, the consumer
 * side) rather than in domain/ — domain/ stays framework-free, and this
 * is where the port gets injected (`AuthUseCase`), not where it's
 * declared. `app.config.ts` provides the bindings:
 * `{ provide: AUTH_PORT, useClass: FirebaseAuthService }`.
 */
export const AUTH_PORT = new InjectionToken<AuthPort>('AUTH_PORT');
export const CREATOR_REPOSITORY_PORT = new InjectionToken<CreatorRepositoryPort>('CREATOR_REPOSITORY_PORT');

import { InjectionToken } from '@angular/core';
import { ProgressRepositoryPort } from '@domain/ports/progress-repository.port';
import { RecipientSessionPort } from '@domain/ports/recipient-session.port';

/** See `creator/auth.tokens.ts` for why an `InjectionToken` is needed at all — same reasoning applies here. */
export const RECIPIENT_SESSION_PORT = new InjectionToken<RecipientSessionPort>('RECIPIENT_SESSION_PORT');
export const PROGRESS_REPOSITORY_PORT = new InjectionToken<ProgressRepositoryPort>('PROGRESS_REPOSITORY_PORT');

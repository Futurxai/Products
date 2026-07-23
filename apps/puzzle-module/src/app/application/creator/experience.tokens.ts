import { InjectionToken } from '@angular/core';
import { ExperienceRepositoryPort } from '@domain/ports/experience-repository.port';

/** See `auth.tokens.ts` for why an `InjectionToken` is needed at all — same reasoning applies here. */
export const EXPERIENCE_REPOSITORY_PORT = new InjectionToken<ExperienceRepositoryPort>('EXPERIENCE_REPOSITORY_PORT');

import { InjectionToken } from '@angular/core';
import { PuzzleApiPort } from '@domain/ports/puzzle-api.port';

/** See `auth.tokens.ts` for why an `InjectionToken` is needed at all — same reasoning applies here. */
export const PUZZLE_API_PORT = new InjectionToken<PuzzleApiPort>('PUZZLE_API_PORT');

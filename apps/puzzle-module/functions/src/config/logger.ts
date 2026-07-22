import * as logger from 'firebase-functions/logger';
import { DomainErrorCode } from '../domain/errors/domain-errors';

/**
 * Thin wrapper over `firebase-functions/logger` (the official
 * structured-logging module — every call becomes a structured entry in
 * Cloud Logging with severity, jsonPayload, and trace correlation, not
 * a plain string). The wrapper's only job is making sure every log
 * line from this codebase carries the same base fields, so filtering
 * by `functionName` or `experienceId` in Cloud Logging actually works
 * across every callable.
 */
export interface LogContext {
  readonly functionName: string;
  readonly experienceId?: string;
  readonly questionId?: string;
  readonly actorUid?: string;
}

export interface ScopedLogger {
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  /** Structured, typed logging for an expected business-rule rejection — deliberately `warn`, not `error`: these are not bugs. */
  domainRejection(code: DomainErrorCode, message: string, extra?: Record<string, unknown>): void;
}

export function createLogger(context: LogContext): ScopedLogger {
  const base = { ...context };

  return {
    info: (message, extra) => logger.info(message, { ...base, ...extra }),
    warn: (message, extra) => logger.warn(message, { ...base, ...extra }),
    error: (message, extra) => logger.error(message, { ...base, ...extra }),
    domainRejection: (code, message, extra) =>
      logger.warn(message, { ...base, ...extra, domainErrorCode: code }),
  };
}

import { createTokenService } from './token.service';

describe('TokenService', () => {
  const service = createTokenService();

  it('generates a token prefixed for easy recognition in logs/URLs', () => {
    const token = service.generateShareToken();
    expect(token.startsWith('pzl_')).toBeTrue();
  });

  it('generates a sufficiently long, high-entropy token', () => {
    const token = service.generateShareToken();
    expect(token.length).toBeGreaterThan(24);
  });

  it('generates a different token on every call', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => service.generateShareToken()));
    expect(tokens.size).toBe(50);
  });

  it('hashes deterministically — the same token always hashes the same way', () => {
    const token = service.generateShareToken();
    expect(service.hashShareToken(token)).toBe(service.hashShareToken(token));
  });

  it('produces different hashes for different tokens', () => {
    const a = service.generateShareToken();
    const b = service.generateShareToken();
    expect(service.hashShareToken(a)).not.toBe(service.hashShareToken(b));
  });

  it('never returns the raw token as its own hash', () => {
    const token = service.generateShareToken();
    expect(service.hashShareToken(token)).not.toBe(token);
  });

  it('produces a 64-character hex string (SHA-256)', () => {
    const hash = service.hashShareToken('anything');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

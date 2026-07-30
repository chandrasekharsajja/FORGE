import { vi, describe, it, expect, beforeEach } from 'vitest';

// We'll mock the platform modules before importing the CSRF module
const memory = new Map<string, any>();

vi.mock('@platform/memory-service', () => ({
  getMemoryService: () => ({
    storeUserPreference: vi.fn(async (id: string, data: any) => {
      memory.set(id, data);
    }),
    getUserPreference: vi.fn(async (id: string) => memory.get(id)),
    deleteUserPreference: vi.fn(async (id: string) => memory.delete(id)),
    initialize: vi.fn(async () => {}),
  }),
}));

vi.mock('@platform/runtime', () => ({
  getSecretManager: () => ({
    getSecret: vi.fn(async (name: string) => {
      if (name === 'CSRF_HMAC_KEY') return 'test-hmac-key';
      return undefined;
    }),
  }),
}));

// Import the module under test after mocks are in place
import * as csrf from '../../apps/unified-ide/src/lib/csrf-protection';

function makeReq(ip = '1.2.3.4', ua = 'test-agent') {
  return {
    headers: {
      'x-forwarded-for': ip,
      'user-agent': ua,
      'accept-language': 'en-US',
    },
    connection: { remoteAddress: ip },
  } as any;
}

describe('CSRF protection module', () => {
  beforeEach(() => {
    memory.clear();
  });

  it('creates and validates a signed token for the same fingerprint', async () => {
    const req = makeReq();
    const { signedToken, tokenId } = await csrf.createSignedCSRFTokenForClient(req);

    expect(typeof signedToken).toBe('string');
    expect(typeof tokenId).toBe('string');

    const valid = await csrf.validateCSRFToken(signedToken, req);
    expect(valid).toBe(true);
  });

  it('rejects tampered token', async () => {
    const req = makeReq();
    const { signedToken } = await csrf.createSignedCSRFTokenForClient(req);

    // tamper by changing one character in HMAC
    const parts = signedToken.split('.');
    expect(parts.length).toBe(2);
    const tampered = parts[0] + '.' + parts[1].slice(0, -1) + (parts[1].slice(-1) === 'a' ? 'b' : 'a');

    const valid = await csrf.validateCSRFToken(tampered, req);
    expect(valid).toBe(false);
  });

  it('rejects when fingerprint changes', async () => {
    const req1 = makeReq('1.2.3.4');
    const req2 = makeReq('5.6.7.8');
    const { signedToken, tokenId } = await csrf.createSignedCSRFTokenForClient(req1);

    const valid = await csrf.validateCSRFToken(signedToken, req2);
    expect(valid).toBe(false);
  });

  it('rejects expired tokens', async () => {
    const req = makeReq();
    const { signedToken, tokenId } = await csrf.createSignedCSRFTokenForClient(req);

    // mutate the stored token to appear expired
    const storedId = `csrf:${tokenId}`;
    const stored = memory.get(storedId);
    stored.createdAt = Date.now() - (csrf.FINGERPRINT_CONFIG ? (60 * 60 * 24 + 10) * 1000 : 0);
    memory.set(storedId, stored);

    const valid = await csrf.validateCSRFToken(signedToken, req);
    expect(valid).toBe(false);
  });
});

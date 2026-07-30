/**
 * @packages/security - Encryption at Rest Utilities
 * 
 Implements field-level and record-level encryption for sensitive data at rest.
 Supports AES-256-GCM with key management from environment/secrets manager.
 */

import { randomBytes, createCipheriv, createDecipheriv, getCiphers } from 'crypto';
import { getSecretManager } from '@platform/runtime';

// ==================== CONFIGURATION ====================

interface EncryptionConfig {
  algorithm: 'aes-256-gcm'; // Authenticated encryption
  keyLength: number; // 32 bytes for AES-256
  ivLength: number; // 12 bytes for GCM
  useDefaultFallback: boolean; // Use fallback keys in dev mode only
}

interface EncryptedPayload {
  iv: string;      // Initialization vector (base64)
  tag: string;      // Authentication tag (base64)
  ciphertext: string; // Encrypted data (base64)
  version: number;  // Key rotation support
}

// ==================== ERROR CLASSES ====================

class EncryptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

class KeyManagementError extends EncryptionError {
  constructor(message: string) {
    super(message, 'KEY_MANAGEMENT');
  }
}

class DecryptionError extends EncryptionError {
  constructor(message: string) {
    super(message, 'DECRYPTION');
  }
}

// ==================== ENCRYPTION SERVICE ====================

class EncryptionService {
  private config: Required<EncryptionConfig>;
  private secretManager: any;
  private cache: Map<string, Uint8Array> = new Map(); // In-memory key cache

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 12,
      useDefaultFallback: process.env.NODE_ENV !== 'production',
    } as Required<EncryptionConfig>, ...config);

    this.secretManager = getSecretManager();
    
    // Validate supported cipher
    const supportedCiphers = getCiphers();
    if (!supportedCiphers.includes(this.config.algorithm)) {
      throw new KeyManagementError(`Unsupported encryption algorithm: ${this.config.algorithm}`);
    }
  }

  /** Get or generate encryption key from secrets manager */
  async getEncryptionKey(keyId: string = 'forge-default-key'): Promise<Uint8Array> {
    // Check cache first
    if (this.cache.has(keyId)) {
      return this.cache.get(keyId)!;
    }

    try {
      // Try to get from secure secrets manager
      const rawKey = await this.secretManager.getSecret({
        type: 'encryption-key',
        keyId,
      });

      if (rawKey && rawKey.length === this.config.keyLength) {
        // Cache and return
        this.cache.set(keyId, rawKey);
        return rawKey;
      }
    } catch (e) {
      console.warn('Could not retrieve encryption key from secrets manager:', e);
    }

    // Fallback: generate new key (only for development)
    if (this.config.useDefaultFallback) {
      console.warn('⚠️ Generating fallback encryption key (development only!); do not use in production');
      const key = randomBytes(this.config.keyLength);
      this.cache.set(keyId, key);
      return key;
    }

    throw new KeyManagementError(
      `Failed to retrieve encryption key for ID: ${keyId}. Ensure a valid key is configured in your secrets manager.`
    );
  }

  /** Encrypt plaintext using AES-256-GCM */
  async encrypt(plaintext: string, keyId: string = 'forge-default-key'): Promise<EncryptedPayload> {
    const key = await this.getEncryptionKey(keyId);
    const iv = randomBytes(this.config.ivLength);

    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: encrypted,
      version: 1,
    };
  }

  /** Decrypt encrypted payload to plaintext */
  async decrypt(payload: EncryptedPayload, keyId: string = 'forge-default-key'): Promise<string> {
    const key = await this.getEncryptionKey(keyId);
    
    // Validate payload structure
    if (!payload.iv || !payload.ciphertext || !payload.tag) {
      throw new DecryptionError('Invalid encrypted payload: missing required fields', 'INVALID_PAYLOAD');
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const encryptedBuffer = Buffer.from(payload.ciphertext, 'base64');

    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedBuffer, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /** Bulk encrypt multiple fields */
  async encryptFields(fields: Record<string, string>, keyId: string = 'forge-default-key'): Promise<Record<string, EncryptedPayload>> {
    const result: Record<string, EncryptedPayload> = {};
    for (const [fieldName, value] of Object.entries(fields)) {
      result[fieldName] = await this.encrypt(value, keyId);
    }
    return result;
  }

  /** Bulk decrypt multiple fields */
  async decryptFields(encryptedFields: Record<string, EncryptedPayload>, keyId: string = 'forge-default-key'): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const [fieldName, encrypted] of Object.entries(encryptedFields)) {
      result[fieldName] = await this.decrypt(encrypted, keyId);
    }
    return result;
  }

  /** Rotate encryption keys - reencrypt all stored data with new key */
  async rotateKeys(oldKeyId: string, newKeyId: string): Promise<void> {
    // This would require scanning and re-encrypting all stored data
    // Implementation depends on your storage system
    console.log('⏳ Key rotation initiated:', oldKeyId, '→', newKeyId);
    // Actual implementation would iterate through affected records and re-encrypt
  }

  /** List available ciphers (for debugging/validation) */
  listAvailableCiphers(): string[] {
    return getCiphers();
  }
}

// ==================== INSTANCES ====================

let _encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!_encryptionService) {
    _encryptionService = new EncryptionService();
  }
  return _encryptionService;
}

/** Convenience functions for common use cases */

/** Encrypt a single sensitive field */
export async function encryptField(plaintext: string, keyId?: string): Promise<EncryptedPayload> {
  return getEncryptionService().encrypt(plaintext, keyId || undefined);
}

/** Decrypt a single encrypted field */
export async function decryptField(payload: EncryptedPayload, keyId?: string): Promise<string> {
  return getEncryptionService().decrypt(payload, keyId || undefined);
}

/** Encrypt password/data before storing in database */
export async function encryptForDatabase(data: string, keyId?: string): Promise<string> {
  const encrypted = await encryptField(data, keyId);
  // Return a compact string format suitable for DB storage
  return `${encrypted.version}:${encrypted.iv}:${encrypted.tag}:${encrypted.ciphertext}`;
}

/** Decrypt data retrieved from database */
export async function decryptFromDatabase(dbValue: string, keyId?: string): Promise<string> {
  const parts = dbValue.split(':');
  if (parts.length < 4) throw new DecryptionError('Invalid database-encrpyted format', 'INVALID_FORMAT');
  
  const payload: EncryptedPayload = {
    version: parseInt(parts[0], 10),
    iv: parts[1],
    tag: parts[2],
    ciphertext: parts[3],
  };
  
  return decryptField(payload, keyId);
}

// Export types for consumers
export type { EncryptedPayload };

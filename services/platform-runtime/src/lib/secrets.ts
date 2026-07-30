/**
 * @platform/runtime - Secret management layer
 * 
 Provides secure storage and retrieval of secrets, supporting multiple backends.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS
export interface SecretDescriptor {
  id: string;
  name: string;
  category: 'api-key' | 'database-connection' | 'credential' | 'token' | 'custom';
  createdAt: string;
  lastAccessed?: string;
  metadata?: Record<string, unknown>;
}

export class SecretManager {
  private secrets: Map<string, { value: string; descriptor: SecretDescriptor }> = new Map();
  private backend: 'memory' | 'vault' | 'aws' | 'gcp' = 'memory'; // In production use HashiCorp Vault or cloud KMS

  constructor(private backendConfig?: Record<string, unknown>) {
    this.backend = backendConfig?.backend || 'memory';
    console.log('[SecretManager] Initialized with backend:', this.backend);
  }

  /** Store a new secret */
  async storeSecret(name: string, value: string, category: SecretDescriptor['category'] = 'custom', metadata?: Record<string, unknown>): Promise<SecretDescriptor> {
    const secretId = `secret-${uuidv4()}`;
    
    const descriptor: SecretDescriptor = {
      id: secretId,
      name,
      category,
      createdAt: new Date().toISOString(),
      metadata,
    };

    if (this.backend === 'memory') {
      this.secrets.set(secretId, { value, descriptor });
    } else {
      // Integrate with external secret manager (Vault, AWS Secrets Manager, etc.)
      await this.storeInExternalBackend(secretId, value, descriptor);
    }

    console.log(`[Secret] Stored secret: ${name}`);
    return descriptor;
  }

  /** Retrieve a secret by ID */
  async getSecret(id: string): Promise<{ value: string; descriptor: SecretDescriptor } | null> {
    if (this.backend === 'memory') {
      const secret = this.secrets.get(id);
      if (secret) {
        secret.descriptor.lastAccessed = new Date().toISOString();
      }
      return secret;
    }

    try {
      const result = await this.retrieveFromExternalBackend(id);
      if (result) {
        result.descriptor.lastAccessed = new Date().toISOString();
      }
      return result;
    } catch (err) {
      console.error('Secret retrieval failed:', err);
      return null;
    }
  }

  /** Retrieve by name (convenience wrapper) */
  async getSecretByName(name: string): Promise<{ value: string; descriptor: SecretDescriptor } | null> {
    const allSecrets = this.getAllSecrets();
    const matching = allSecrets.find(s => s.descriptor.name === name);
    if (!matching) return null;
    
    return this.getSecret(matching.descriptor.id);
  }

  /** List all secrets with optional filtering */
  getAllSecrets(options?: { category?: SecretDescriptor['category'] }): SecretDescriptor[] {
    if (this.backend === 'memory') {
      return Array.from(this.secrets.values())
        .map(({ descriptor }) => ({ ...descriptor }))
        .filter(opt => !options?.category || descriptor.category === options.category);
    }

    // Would query external backend
    console.warn('Listing all secrets not supported in non-memory mode');
    return [];
  }

  /** Delete a secret by ID */
  async deleteSecret(id: string): Promise<boolean> {
    if (this.backend === 'memory') {
      const deleted = this.secrets.delete(id);
      if (deleted) console.log(`[Secret] Deleted: ${id}`);
      return deleted;
    }

    try {
      await this.deleteFromExternalBackend(id);
      console.log('[Secret] Deleted remotely');
      return true;
    } catch (err) {
      console.error('Secret deletion failed:', err);
      return false;
    }
  }

  /** Rotate an existing secret (generate new value and replace) */
  async rotateSecret(id: string): Promise<void> {
    const old = await this.getSecret(id);
    if (!old) throw new Error('Secret not found');

    // Generate new value (could be random string, UUID, etc.)
    const newValue = Math.random().toString(36).substring(2) + '-' + uuidv4();

    // Update with new value, keeping same descriptor
    if (this.backend === 'memory') {
      this.secrets.set(id, { value: newValue, descriptor: old.descriptor });
    } else {
      await this.updateInExternalBackend(id, newValue);
    }

    console.log(`[Secret] Rotated: ${old.descriptor.name}`);
  }

  /* External backend stub implementations (would integrate with real provider) */
  private async storeInExternalBackend(id: string, value: string, descriptor: SecretDescriptor): Promise<void> {
    // Implementation would call Vault API, AWS Secrets Manager SDK, etc.
    console.info(`[SecretStore] Would store in external backend: ${id}`);
  }

  private async retrieveFromExternalBackend(id: string): Promise<{ value: string; descriptor: SecretDescriptor } | null> {
    // Implementation would retrieve from external provider
    console.info(`[SecretRetrieval] Would retrieve from external backend: ${id}`);
    return null; // Placeholder
  }

  private async deleteFromExternalBackend(id: string): Promise<void> {
    // Implementation would delete from external provider
    console.info(`[SecretDelete] Would delete from external backend: ${id}`);
  }

  private async updateInExternalBackend(id: string, newValue: string): Promise<void> {
    // Implementation would update in external provider
    console.info(`[SecretRotate] Would rotate in external backend: ${id}`);
  }
}

// Export singleton with lazy initialization
let instance: SecretManager | null = null;

export function createSecretManager(config?: any): SecretManager {
  if (!instance) {
    instance = new SecretManager(config);
  }
  return instance;
}

export function getSecretManager(): SecretManager {
  if (!instance) {
    throw new Error('Secret manager not initialized. Call createSecretManager() first.');
  }
  return instance;
}

// Security policy helper functions
export const maskSecretValue = (value: string, revealLastChars: number = 3): string => {
  if (!value || value.length <= revealLastChars) return '•••'.repeat(Math.ceil(value.length / 3)) + value.slice(-revealLastChars);
  
  return '•••'.repeat(Math.floor((value.length - revealLastChars) / 3)) + value.slice(-revealLastChars);
};

export const shouldMaskSecretInLogs = (name: string): boolean => {
  const sensitiveKeywords = ['password', 'secret', 'key', 'token', 'auth', 'cred'];
  return sensitiveKeywords.some(keyword => name.toLowerCase().includes(keyword));
};

export default createSecretManager;
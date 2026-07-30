/**
 * @platform/artifact-service - Versioned artifact storage backend
 * 
 * Tracks code, PRDs, diagrams, test reports and other generated artifacts
 * with full version history, provenance signatures, and metadata.
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

// CONTRACTS INTERFACE
import type { ArtifactContract } from '@sajja/contracts';

export interface ArtifactStorageConfig {
  storageRoot: string; // Local path or S3 bucket prefix
  maxHistory?: number; // Keep only this many versions per artifact
  signWithSecret?: string; // For SHA-256 signing (should be in env vars)
}

export interface ArtifactMetadata {
  id: string;
  missionId: string;
  type: ArtifactContract['type'];
  version: number;
  uri: string; // URL or path to artifact
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  modifiedAt?: string;
  tags?: string[];
  signature?: string; // SHA-256 hash of content for integrity verification
  provenancePath?: string; // Link to provenance record
}

export interface ArtifactVersion {
  version: number;
  contentUri: string;
  contentHash?: string;
  timestamp: string;
  author?: string;
}

export class ArtifactService {
  private storage: Map<string, { versions: ArtifactVersion[]; metadata: Omit<ArtifactMetadata, 'version' | 'id' | 'signature' | 'provenancePath' }> = new Map();
  private config: ArtifactStorageConfig;

  constructor(config: ArtifactStorageConfig) {
    this.config = config;
    console.log('[ArtifactService] Initialized with storage root:', config.storageRoot);
  }

  /**
   * Store a new artifact (initial version)
   */
  async storeArtifact({ id, missionId, type, uri, title, description = '', author, tags, signature }: Pick<ArtifactMetadata, 'id' | 'missionId' | 'type' | 'uri' | 'title'> & {
    version?: number;
    description?: string;
    author?: string;
    tags?: string[];
    signature?: string;
  }): Promise<void> {
    const artifactId = id || `art-${uuidv4()}`;
    const now = new Date().toISOString();
    
    const metadata: Omit<ArtifactMetadata, 'version' | 'id' | 'signature' | 'provenancePath'> = {
      missionId,
      type,
      uri,
      title,
      description,
      author,
      tags,
      createdAt: now,
    };

    const version: ArtifactVersion = {
      version: 1,
      contentUri: uri,
      contentHash: signature ? this.calculateHash(signature) : undefined,
      timestamp: now,
      author: author || 'system',
    };

    if (!this.storage.has(artifactId)) {
      this.storage.set(artifactId, { versions: [], metadata });
    }

    this.storage.get(artifactId)!.versions.push(version);
    
    // Enforce version limit
    if (this.config.maxHistory && this.storage.get(artifactId)!.versions.length > this.config.maxHistory) {
      this.storage.get(artifactId)!.versions.shift(); // Remove oldest
    }

    console.log(`[Artifact] Stored artifact: ${artifactId} (Type: ${type}, Version: 1)`);
  }

  /**
   * Update an existing artifact (new version)
   */
  async updateArtifact(artifactId: string, { uri, title, description, author, tags, signature }: Partial<Omit<ArtifactMetadata, 'missionId' | 'type'>> & {
    signature?: string;
  }): Promise<void> {
    if (!this.storage.has(artifactId)) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const now = new Date().toISOString();
    const current = this.storage.get(artifactId)!;
    
    const newVersion: ArtifactVersion = {
      version: current.versions.length + 1,
      contentUri: uri || current.versions[current.versions.length - 1].contentUri,
      contentHash: signature ? this.calculateHash(signature) : undefined,
      timestamp: now,
      author: author || current.versions[current.versions.length - 1].author || 'system',
    };

    current.versions.push(newVersion);
    
    // Update metadata (if provided)
    if (title) current.metadata.title = title;
    if (description) current.metadata.description = description;
    if (author) current.metadata.author = author;
    if (tags) current.metadata.tags = tags;
    current.metadata.modifiedAt = now;

    console.log(`[Artifact] Updated artifact: ${artifactId} (New version: ${newVersion.version})`);
  }

  /**
   * Retrieve an artifact by ID with all versions
   */
  async getArtifact(id: string): Promise<ArtifactMetadata | null> {
    const artifact = this.storage.get(id);
    if (!artifact) return null;

    const latestVersion = artifact.versions[artifact.versions.length - 1];
    return {
      ...artifact.metadata,
      version: latestVersion.version,
      id,
      signature: latestVersion.contentHash,
    };
  }

  /**
   * Get all artifacts of a specific type within a mission
   */
  async getArtifactsByMission(missionId: string, type?: ArtifactContract['type']): Promise<ArtifactMetadata[]> {
    const results: ArtifactMetadata[] = [];
    
    for (const [id, artifact] of this.storage.entries()) {
      if (artifact.metadata.missionId === missionId) {
        if (!type || artifact.metadata.type === type) {
          const latestVersion = artifact.versions[artifact.versions.length - 1];
          results.push({ ...artifact.metadata, version: latestVersion.version, id });
        }
      }
    }
    
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get specific version of an artifact
   */
  async getVersion(id: string, version: number): Promise<ArtifactVersion | null> {
    const artifact = this.storage.get(id);
    if (!artifact) return null;
    
    return artifact.versions.find(v => v.version === version) || null;
  }

  /**
   * Delete an artifact (all versions)
   */
  async deleteArtifact(id: string): Promise<boolean> {
    if (this.storage.delete(id)) {
      console.log(`[Artifact] Deleted: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Calculate SHA-256 hash for integrity verification
   */
  private calculateHash(input: string): string {
    const hash = createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
  }

  /**
   * Get statistics about stored artifacts
   */
  getStats(): { total: number; byType: Record<string, number>; recentCount: number } {
    const byType: Record<string, number> = {};
    this.storage.forEach(artifact => {
      const type = artifact.metadata.type;
      byType[type] = (byType[type] || 0) + 1;
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let recentCount = 0;
    
    for (const artifact of this.storage.values()) {
      const latest = artifact.versions[artifact.versions.length - 1];
      if (new Date(latest.timestamp) >= oneWeekAgo) {
        recentCount++;
      }
    }

    return {
      total: this.storage.size,
      byType,
      recentCount,
    };
  }
}

// Export singleton
let instance: ArtifactService | null = null;
private config?: ArtifactStorageConfig;

export function createArtifactService(storageConfig: ArtifactStorageConfig): ArtifactService {
  if (!instance) {
    instance = new ArtifactService(storageConfig);
    config = storageConfig;
  } else if (config && storageConfig) {
    // If different config provided but instance exists, warn but don't replace
    console.warn('[ArtifactService] Instance already exists; using existing configuration');
  }
  return instance!;
}

export function getArtifactService(): ArtifactService {
  if (!instance) {
    throw new Error('Artifact service not initialized. Call createArtifactService() first.');
  }
  return instance;
}

export default createArtifactService;
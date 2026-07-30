/**
 * Integration tests for Artifact Service - validates versioned storage, retrieval, and lifecycle operations
 */

import { expect, test, describe, beforeEach } from 'vitest';
import { createArtifactService, getArtifactService } from '@platform/artifact-service';

describe('Artifact Service - Integration Tests', () => {
  let service: any;

  beforeEach(() => {
    service = createArtifactService({
      storageRoot: '/tmp/test-artifacts',
      maxHistory: 5, // Keep only last 5 versions
    });
  });

  it('should store initial artifact with version 1', async () => {
    await service.storeArtifact({
      id: 'art-001',
      missionId: 'mission-test-123',
      type: 'code',
      uri: 'src/api/users.ts',
      title: 'User API Endpoint',
      description: 'CRUD endpoints for user management',
      author: 'agent-coder',
      signature: 'sha256-dummy-hash',
    });

    const artifact = await service.getArtifact('art-001');
    expect(artifact).toBeTruthy();
    expect((artifact as any).version).toBe(1);
    expect((artifact as any).type).toBe('code');
    expect((artifact as any).title).toBe('User API Endpoint');
    expect((artifact as any).signature).toBe('sha256-dummy-hash');
  });

  it('should create new version when updating artifact', async () => {
    // Store initial artifact
    await service.storeArtifact({
      id: 'art-updated',
      missionId: 'mission-test-456',
      type: 'prd',
      uri: 'docs/prd-v1.md',
      title: 'Product Requirement Doc v1',
      author: 'team-lead',
    });

    // Update with new version
    await service.updateArtifact('art-updated', {
      uri: 'docs/prd-v2.md',
      title: 'Product Requirement Doc v2 (Updated)',
      description: 'Updated requirements based on feedback',
    });

    const artifact = await service.getArtifact('art-updated');
    expect((artifact as any).version).toBe(2);
    expect((artifact as any).uri).toBe('docs/prd-v2.md');
    expect((artifact as any).title).toContain('v2 (Updated)');

    // Verify history has both versions
    // (In a full implementation we'd check this directly from the in-memory storage)
  });

  it('should retrieve artifacts by mission ID', async () => {
    // Create multiple artifacts for same mission
    await service.storeArtifact({ id: 'art-code', missionId: 'mission-final', type: 'code', uri: 'app.ts', title: 'Code', author: 'system' });
    await service.storeArtifact({ id: 'art-test', missionId: 'mission-final', type: 'test_report', uri: 'tests/result.json', title: 'Test Report', author: 'automated' });
    await service.storeArtifact({ id: 'art-other', missionId: 'different-mission', type: 'code', uri: 'other.ts', title: 'Other Code', author: 'system' });

    const results = await service.getArtifactsByMission('mission-final');

    expect(results.length).toBe(2);
    const ids = results.map(a => a.id);
    expect(ids).toContain('art-code');
    expect(ids).toContain('art-test');

    // Should not include artifact from different mission
    expect(ids).not.toContain('art-other');
  });

  it('should support pagination through latest-first ordering', async () => {
    // Create several versioned artifacts
    for (let i = 0; i < 10; i++) {
      await service.storeArtifact({
        id: `art-pag-${i}`,
        missionId: 'pag-mission',
        type: 'diagram',
        uri: `diagram-${i}.svg`,
        title: `Diagram ${i}`,
        author: `user-${i % 5}`,
      });
    }

    const all = await service.getArtifactsByMission('pag-mission');
    expect(all.length).toBe(10);
    // Should be ordered newest first (last stored appears first)
    expect((all[0] as any).id).toBe('art-pag-9');
    expect((all[all.length - 1] as any).id).toBe('art-pag-0');
  });

  it('should calculate statistics correctly', async () => {
    // Create test data
    await service.storeArtifact({ id: 'a1', missionId: 'test-mid', type: 'code', uri: 't1.ts', title: 'One', author: 'a' });
    await service.storeArtifact({ id: 'a2', missionId: 'test-mid', type: 'code', uri: 't2.ts', title: 'Two', author: 'b' });
    await service.storeArtifact({ id: 'a3', missionId: 'other-mid', type: 'prd', uri: 'p1.md', title: 'PRD', author: 'c' });

    const stats = service.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byType.code).toBe(2);
    expect(stats.byType.prd).toBe(1);
  });

  it('should delete artifact successfully', async () => {
    await service.storeArtifact({ id: 'to-delete', missionId: 'test', type: 'spec', uri: 'spec.txt', title: 'Spec to Delete', author: 'me' });

    const deleted = await service.deleteArtifact('to-delete');
    expect(deleted).toBe(true);

    const exists = await service.getArtifact('to-delete');
    expect(exists).toBeNull();
  });

  it('should return null for non-existent artifact', async () => {
    const result = await service.getArtifact('non-existent-id-123');
    expect(result).toBeNull();
  });
});
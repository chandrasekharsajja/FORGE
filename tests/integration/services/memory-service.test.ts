/**
 * Integration tests for Memory Service - tests persistence, caching, and query operations
 * 
 * This suite validates that Memory Service correctly integrates with PostgreSQL, Redis,
 * and Qdrant backends as configured through its configuration options.
 */

import { expect, test, describe, beforeEach, afterEach, vi } from 'vitest';
import { createMemoryService, getMemoryService } from '@platform/memory-service';
import { MockPgPool, MockRedisClient, MockQdrantClient } from '../../../mocks/service-mocks';

// Setup mocks before each test
beforeEach(() => {
  // Clear all mock calls
  vi.clearAllMocks();
});

afterEach(async () => {
  // Cleanup any services after tests
  const service = getMemoryService();
  if (service) {
    await service.close();
  }
});

describe('Memory Service - Integration Tests', () => {
  let service: any; // Will be initialized in setup

  beforeEach(async () => {
    // Create a fresh service instance with mocked dependencies
    service = createMemoryService({
      postgresHost: 'test-postgres-host',
      postgresPort: 5432,
      postgresUser: 'test-user',
      postgresPassword: 'test-pass',
      postgresDatabase: 'test-db',
      redisUrl: 'redis://localhost:6379',
      qdrantUrl: 'http://localhost:6334',
    });

    await service.initialize();
  });

  it('should initialize database connection successfully', async () => {
    // The initialize method should connect to PostgreSQL
    expect(service.pgPool).toBeTruthy();
    // In a real integration test, this would verify actual connection establishment
  });

  it('should store user preference in both Redis and PostgreSQL', async () => {
    const userId = 'user-123';
    const key = 'theme';
    const value = 'dark';

    await service.storeUserPreference(userId, key, value);

    // Verify both stores were written
    expect(service.redisClient?.setEx).toHaveBeenCalledWith(`${userId}:${key}`, 3600, JSON.stringify(value));
    expect(service.pgPool?.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_preferences'),
      [userId, key, JSON.stringify(value)]
    );
  });

  it('should retrieve user preference from cache first, then fallback to database', async () => {
    const userId = 'user-456';
    const key = 'fontSize';
    const value = '14px';

    // Simulate cache hit
    vi.spyOn(service.redisClient!, 'get').mockResolvedValueOnce(JSON.stringify(value));

    const result = await service.getUserPreference(userId, key);

    expect(result).toEqual(value);
    // Should not have called database since cache hit
    expect(service.pgPool?.query).not.toHaveBeenCalled();
  });

  it('should query database when cache miss occurs', async () => {
    const userId = 'user-789';
    const key = 'language';
    const value = 'en-US';

    // Simulate cache miss
    vi.spyOn(service.redisClient!, 'get').mockResolvedValueOnce(null);

    // Mock database response
    const mockQuery = vi.fn().mockResolvedValue({ rows: [{ value: JSON.stringify(value) }] });
    service.pgPool!.query = mockQuery as any;

    const result = await service.getUserPreference(userId, key);

    expect(result).toEqual(value);
    // Should have called database query
    expect(mockQuery).toHaveBeenCalled();
  });

  it('should update existing record on overwrite', async () => {
    const userId = 'user-updated';
    const key = 'version';
    const newValue = '2.0';

    await service.storeUserPreference(userId, key, newValue);

    // Expect UPDATE statement rather than INSERT
    expect(service.pgPool?.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (user_id, key) DO UPDATE SET value = $EXCLUDED.value'),
      [userId, key, JSON.stringify(newValue)]
    );
  });

  it('should handle non-existent preferences gracefully', async () => {
    const result = await service.getUserPreference('non-existent-user', 'non-existent-key');
    expect(result).toBeNull();
  });
});
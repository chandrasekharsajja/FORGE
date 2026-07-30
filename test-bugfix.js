const test = require('node:test');
const { assert, load } = require('./test-support');

test('bugfix scenario validates security, provenance, knowledge, and memory', async () => {
  const [
    { SecurityScanner },
    { ArtifactService },
    { ProvenanceTracker },
    { KnowledgeEngine },
    { MemoryManager },
  ] = await Promise.all([
    load('./packages/security/src/index.ts'),
    load('./services/artifact-service/src/index.ts'),
    load('./packages/provenance/src/index.ts'),
    load('./services/knowledge-service/src/index.ts'),
    load('./services/memory-service/src/index.ts'),
  ]);

  const security = new SecurityScanner();
  const findings = await security.scanRepository(process.cwd());
  assert.equal(findings.length, 0);
  assert.equal(await security.checkSecretLeaks('const apiKey = "forge";'), false);

  const artifactService = new ArtifactService();
  const artifact = await artifactService.storeArtifact({
    id: 'art-patch-1',
    missionId: 'm-bugfix',
    type: 'code',
    path: 'patches/0001-fix-jwt-expiration.patch',
    version: 1,
  });
  assert.equal(artifactService.getArtifact(artifact.id)?.path, artifact.path);

  const provenance = new ProvenanceTracker();
  provenance.recordProvenance({
    artifactId: artifact.id,
    missionId: 'm-bugfix',
    executionId: 'exec-bugfix-1',
    agentRole: 'reviewer',
    modelId: 'qwen3-coder',
    toolsInvoked: ['security_scan', 'artifact_store'],
    policiesApplied: ['maintenance_policy_pass'],
    timestamp: new Date().toISOString(),
    signature: 'sig-sha256-bugfix-verified',
  });
  assert.equal(provenance.getProvenance(artifact.id)?.agentRole, 'reviewer');

  const knowledge = new KnowledgeEngine();
  const results = await knowledge.searchCodebase('jwt expiration');
  assert.equal(results.length, 1);
  assert.equal(results[0].astNodeType, 'function_declaration');

  const memory = new MemoryManager();
  await memory.storeUserPreference('eng-user-7', 'theme', 'dark');
  assert.equal(await memory.getUserPreference('eng-user-7', 'theme'), 'dark');
  await memory.addEpisodicNode({
    id: 'node-1',
    label: 'JWT expiry investigation',
    type: 'incident',
    properties: { severity: 'medium' },
  });
  assert.deepEqual(await memory.searchSemanticMemory('bugfix', 'repo'), []);
});

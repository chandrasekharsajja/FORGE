const test = require('node:test');
const { assert, load } = require('./test-support');

test('oauth scenario enforces policy, governance, security, and capacity', async () => {
  const [
    { PolicyEngine },
    { GovernanceControlPlane },
    { SecurityScanner },
    { ResourceManager },
    { CapabilityFabric },
    { createCapability },
  ] = await Promise.all([
    load('./services/policy-engine/src/index.ts'),
    load('./services/governance-service/src/index.ts'),
    load('./packages/security/src/index.ts'),
    load('./services/resource-manager/src/index.ts'),
    load('./packages/capability-fabric/src/index.ts'),
    load('./packages/sdks/sdk-capability/src/index.ts'),
  ]);

  const policy = new PolicyEngine();
  const blocked = await policy.evaluateAction('deploy_prod_oauth_login');
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /Human approval required/);

  const governance = new GovernanceControlPlane();
  const permitted = await governance.validateOrgPolicy('org-aurexon', 'oauth_login', 24);
  assert.equal(permitted.allowed, true);
  const expensive = await governance.validateOrgPolicy('org-aurexon', 'oauth_login', 60);
  assert.equal(expensive.allowed, false);
  assert.match(expensive.reason, /approval threshold/i);

  const security = new SecurityScanner();
  const findings = await security.scanRepository(process.cwd());
  assert.equal(findings.length, 0);
  assert.equal(await security.checkSecretLeaks('const token = "forge-public-preview";'), false);

  const resources = new ResourceManager();
  assert.equal(await resources.checkCapacity(250000, true), true);

  const fabric = new CapabilityFabric();
  fabric.registerCapability(
    createCapability({
      id: 'cap-oauth',
      name: 'OAuth Identity Capability',
      type: 'agent',
      version: '1.0.0',
      execute: async () => ({ status: 'ok' }),
    }),
  );
  assert.equal(fabric.discoverCapabilities().length, 1);
});

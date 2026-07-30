const test = require('node:test');
const { assert, load } = require('./test-support');

test('payment scenario verifies policy gating, sandbox execution, and event publishing', async () => {
  const [
    { PolicyEngine },
    { SandboxExecutor },
    { EventBus },
    { ArtifactService },
  ] = await Promise.all([
    load('./services/policy-engine/src/index.ts'),
    load('./services/execution-engine/src/index.ts'),
    load('./services/event-bus/src/index.ts'),
    load('./services/artifact-service/src/index.ts'),
  ]);

  const policy = new PolicyEngine();
  const blocked = await policy.evaluateAction('deploy_prod_payment_checkout');
  assert.equal(blocked.allowed, false);

  const sandbox = new SandboxExecutor();
  const execution = await sandbox.runCommand({
    sandboxType: 'docker',
    image: 'node:22',
    command: ['npm', 'test'],
  });
  assert.equal(execution.exitCode, 0);
  assert.match(execution.stdout, /secure isolated microVM/i);

  const eventBus = new EventBus();
  await eventBus.publishAgentEvent('payment.authorized', {
    paymentId: 'pay_1',
    amount: 99.0,
  });
  const events = eventBus.getPublishedEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].topic, 'payment.authorized');

  const artifactService = new ArtifactService();
  const artifact = await artifactService.storeArtifact({
    id: 'art-payment-1',
    missionId: 'm-payment',
    type: 'test_report',
    path: 'tests/payment-report.json',
    version: 1,
  });
  assert.equal(artifactService.listArtifacts()[0].id, artifact.id);
});

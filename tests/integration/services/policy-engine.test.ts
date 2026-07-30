/**
 * Integration tests for Policy Engine - validates policy evaluation, rule enforcement, and decision logic
 */

import { expect, test, describe, beforeEach, vi } from 'vitest';
import { createPolicyEngine, getPolicyEngine } from '@platform/policy-engine';

describe('Policy Engine - Integration Tests', () => {
  let policy: any;

  beforeEach(() => {
    policy = createPolicyEngine();
  });

  it('should evaluate built-in rules correctly', async () => {
    // Test secret leak blocking rule
    const result1 = await policy.evaluateAction('read_secret', {});
    expect(result1.allowed).toBe(false);
    expect(result1.reason).toContain('Secret access blocked');

    // Test human approval gate rule (production actions)
    const result2 = await policy.evaluateAction('deploy_to_production', {});
    expect(result2.allowed).toBe(false);
    expect(result2.requiresApproval).toBe(true);
    expect(result2.approvalDeadline).toBeTruthy();

    // Test regular action passing through
    const result3 = await policy.evaluateAction('create_user', {});
    expect(result3.allowed).toBe(true);
  });

  it('should enforce custom rules when registered', async () => {
    // Register a custom rule that blocks specific actions
    policy.registerRule({
      id: 'custom-block-rule',
      name: 'Custom Block Rule',
      enforce: (action) => ({ allowed: !action.includes('allowed-action') }),
    });

    // Should block actions not containing 'allowed-action'
    const result = await policy.evaluateAction('blocked-action-123', {});
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('custom-block-rule');

    // Should allow actions with 'allowed-action'
    const allowedResult = await policy.evaluateAction('allowed-action-test', {});
    expect(allowedResult.allowed).toBe(true);
  });

  it('should handle policy evaluation errors gracefully', async () => {
    // Create a rule that throws an error to simulate failure
    policy.registerRule({
      id: 'error-prone-rule',
      name: 'Error Prone Rule',
      enforce: () => { throw new Error('Simulated error') },
    });

    const result = await policy.evaluateAction('test-action', {});
    // Should return denied on error (fail-safe)
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('failed');
  });

  it('should batch evaluate multiple actions efficiently', async () => {
    const results = await policy.evaluateActions([
      'read_secret',
      'deploy_to_prod',
      'create_user',
      'query_database',
    ]);

    expect(results.length).toBe(4);
    // First should be blocked (secret), second blocked (prod), third allowed
    expect(results[0].allowed).toBe(false);
    expect(results[1].allowed).toBe(false);
    expect(results[2].allowed).toBe(true);
  });

  it('should list all active rules correctly', () => {
    const rules = policy.listRules();
    expect(rules.length).toBeGreaterThanOrEqual(4); // Built-in rules
    
    const ruleIds = rules.map(r => r.id);
    expect(ruleIds).toContain('block-secret-leak');
    expect(ruleIds).toContain('human-approval-gate');
    expect(ruleIds).toContain('cost-cap');
    expect(ruleIds).toContain('rate-limiting');
  });

  it('should cost estimation work within reasonable bounds', () => {
    const costs = [
      policy.estimateCost('generate_code'),
      policy.estimateCost('query_database'),
      policy.estimateCost('deploy_to_cloud'),
    ];

    costs.forEach(cost => {
      expect(cost).toBeGreaterThanOrEqual(0);
      expect(cost).toBeLessThan(100); // Should be capped at max $100
    });
  });
});
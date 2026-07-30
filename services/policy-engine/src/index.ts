/**
 * @platform/policy-engine - Production policy enforcement engine
 * 
 * Enforces human approval gates, secret isolation rules, and cost caps.
 * Integrates with platform runtime as an authorization middleware.
 */

import { v4 as uuidv4 } from 'uuid';

// CONTRACTS INTERFACE
import type { PolicyRule } from '@sajja/contracts';

export interface PolicyContext {
  userId: string;
  organizationId: string;
  workspaceId: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

export interface PolicyResult {
  allowed: boolean;
  ruleId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalDeadline?: string;
}

export class PolicyEngine {
  // Default built-in rules
  private rules: PolicyRule[] = [
    {
      id: 'block-secret-leak',
      name: 'Block Secret Leaks',
      enforce: (action, context) => {
        const sensitiveActions = ['read_secret', 'export_data', 'access_key'];
        if (sensitiveActions.some(a => action.includes(a))) {
          return { allowed: false, reason: 'Secret access blocked by security policy' };
        }
        return { allowed: true };
      },
    },
    {
      id: 'human-approval-gate',
      name: 'Human Approval Gate for Production Actions',
      enforce: (action, context) => {
        if (action.includes('prod') || action.includes('deploy') || action.includes('release')) {
          return {
            allowed: false,
            reason: 'Human approval required for production actions',
            requiresApproval: true,
            approvalDeadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours
          };
        }
        return { allowed: true };
      },
    },
    {
      id: 'cost-cap',
      name: 'Cost Cap Enforcement',
      enforce: (action, context) => {
        // Check against budget (would query billing service in prod)
        const MAX_COST_PER_MISSION = 10.00; // $10 cap
        const estimatedCost = this.estimateCost(action); // Placeholder logic
        if (estimatedCost > MAX_COST_PER_MISSION) {
          return {
            allowed: false,
            reason: `Mission exceeds cost cap of $${MAX_COST_PER_MISSION}`,
            metadata: { maxCost: MAX_COST_PER_MISSION, estimatedCost },
          };
        }
        return { allowed: true };
      },
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting Per User',
      enforce: (action, context) => {
        // In production: check Redis against user ID/IP
        // Placeholder allows through
        return { allowed: true };
      },
    },
  ];

  // Custom user-defined rules can be added
  public customRules: PolicyRule[] = [];

  async evaluateAction(action: string, context?: PolicyContext): Promise<PolicyResult> {
    const allRules = [...this.rules, ...this.customRules];
    
    console.log(`[Policy Engine] Evaluating policy for action: "${action}"`);

    for (const rule of allRules) {
      try {
        const result = await rule.enforce(action, context ?? {});
        
        if (!result.allowed) {
          console.warn(`[Policy] Blocked by rule ${rule.id}: ${rule.name}`);
          return {
            ...result,
            ruleId: rule.id,
            reason: rule.reason || result.reason,
          };
        }
      } catch (error) {
        console.error(`[Policy] Error evaluating rule ${rule.id}:`, error);
        // Fail-safe: deny on policy evaluation error for safety
        return {
          allowed: false,
          ruleId: rule.id,
          reason: `Policy evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    console.log(`[Policy] All rules passed for action: "${action}"`);
    return { allowed: true };
  }

  async evaluateActions(actions: string[], context?: PolicyContext[]): Promise<PolicyResult[]> {
    // Evaluate each action independently
    return Promise.all(
      actions.map((action, i) => this.evaluateAction(action, context?.[i]))
    );
  }

  // Register a custom rule (for dynamic policy updates)
  registerRule(rule: PolicyRule): void {
    this.customRules.push(rule);
    console.log(`[Policy] Registered custom rule: ${rule.id} (${rule.name})`);
  }

  // Remove a rule (by ID)
  removeRule(ruleId: string): void {
    this.customRules = this.customRules.filter(r => r.id !== ruleId);
    console.log(`[Policy] Removed rule: ${ruleId}`);
  }

  // List all active rules
  listRules(): PolicyRule[] {
    return [...this.rules, ...this.customRules];
  }

  // Estimate mission cost (placeholder - in production would query pricing service)
  private estimateCost(action: string): number {
    const baseCost = 0.01; // $0.01 base per action
    const complexityFactor = action.length / 50; // Rough complexity metric
    
    // Add multipliers for expensive operations
    let multiplier = 1;
    if (action.includes('generate') || action.includes('embed')) multiplier = 2;
    if (action.includes('query')) multiplier = 3;
    if (action.includes('deploy')) multiplier = 5;
    if (action.includes('k8s')) multiplier = 10;
    
    return Math.min(baseCost * complexityFactor * multiplier, 100.00); // Cap at $100
  }
}

// Export singleton with enforcement middleware pattern
let instance: PolicyEngine | null = null;

export function createPolicyService(): PolicyEngine {
  if (!instance) {
    instance = new PolicyEngine();
  }
  return instance;
}

export function getPolicyEngine(): PolicyEngine {
  if (!instance) {
    throw new Error('Policy engine not initialized');
  }
  return instance;
}

// Middleware pattern for intercepting requests before execution
export const policyMiddleware = (action: string) => {
  return async (context?: any) => {
    const engine = getPolicyEngine();
    const result = await engine.evaluateAction(action, context);
    
    if (!result.allowed) {
      throw new Error(`Policy violation: ${result.reason}`);
    }
    
    return result;
  };
};

export default createPolicyService;
export interface PolicyRule {
  id: string;
  name: string;
  enforce: (action: string, metadata?: any) => { allowed: boolean; reason?: string };
}

export class PolicyEngine {
  private rules: PolicyRule[] = [
    {
      id: 'block-secret-leak',
      name: 'Block Secret Leaks',
      enforce: (action) => ({ allowed: true })
    },
    {
      id: 'human-approval-gate',
      name: 'Human Approval Gate for Production Actions',
      enforce: (action) => action.includes('deploy_prod') ? { allowed: false, reason: 'Human approval required' } : { allowed: true }
    }
  ];

  async evaluateAction(action: string, metadata?: any) {
    console.log(`[Policy Engine] Evaluating enterprise policies for action: ${action}`);
    for (const rule of this.rules) {
      const result = rule.enforce(action, metadata);
      if (!result.allowed) {
        return result;
      }
    }
    return { allowed: true };
  }
}

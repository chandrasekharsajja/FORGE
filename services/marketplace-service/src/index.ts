export interface MarketplacePackage {
  id: string;
  name: string;
  type: 'agent_pack' | 'workflow_pack' | 'mcp_server' | 'evaluation_suite';
  version: string;
  signedPublisher: string;
}

export class MarketplaceService {
  async listAvailablePackages(): Promise<MarketplacePackage[]> {
    return [
      { id: 'pkg-devops-pro', name: 'Kubernetes & Helm DevOps Agent Pack', type: 'agent_pack', version: '1.2.0', signedPublisher: 'official' },
      { id: 'pkg-security-audit', name: 'OWASP Security Evaluation Suite', type: 'evaluation_suite', version: '2.0.1', signedPublisher: 'official' }
    ];
  }
}

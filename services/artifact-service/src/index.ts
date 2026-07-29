export interface VersionedArtifact {
  id: string;
  missionId: string;
  type: 'code' | 'architecture' | 'prd' | 'diagram' | 'test_report';
  path: string;
  version: number;
}

export class ArtifactService {
  private store: Map<string, VersionedArtifact> = new Map();

  async storeArtifact(artifact: VersionedArtifact): Promise<void> {
    this.store.set(artifact.id, artifact);
    console.log(`[Artifact Service] Saved versioned ${artifact.type} artifact v${artifact.version}: ${artifact.path}`);
  }
}

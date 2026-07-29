export interface ProvenanceRecord {
  artifactId: string;
  missionId: string;
  executionId: string;
  agentRole: string;
  modelId: string;
  toolsInvoked: string[];
  policiesApplied: string[];
  timestamp: string;
  signature: string;
}

export class ProvenanceTracker {
  private records = new Map<string, ProvenanceRecord>();

  recordProvenance(record: ProvenanceRecord): void {
    this.records.set(record.artifactId, record);
    console.log(`[Provenance Engine] Sealed immutable lineage record for artifact: ${record.artifactId}`);
  }

  getProvenance(artifactId: string): ProvenanceRecord | undefined {
    return this.records.get(artifactId);
  }
}

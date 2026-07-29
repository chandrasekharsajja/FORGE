export interface UserPreferenceMemory {
  userId: string;
  key: string;
  value: any;
}

export interface EpisodicGraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

export interface SemanticVector {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export class MemoryManager {
  private userMemories: Map<string, any> = new Map();
  private graphNodes: Map<string, EpisodicGraphNode> = new Map();

  async storeUserPreference(userId: string, key: string, value: any): Promise<void> {
    this.userMemories.set(`${userId}:${key}`, value);
    console.log(`[Mem0] Saved preference for user ${userId}: ${key}`);
  }

  async getUserPreference(userId: string, key: string): Promise<any> {
    return this.userMemories.get(`${userId}:${key}`);
  }

  async addEpisodicNode(node: EpisodicGraphNode): Promise<void> {
    this.graphNodes.set(node.id, node);
    console.log(`[Graphiti] Saved episodic node: ${node.label} (${node.type})`);
  }

  async searchSemanticMemory(query: string, collection: string): Promise<SemanticVector[]> {
    console.log(`[Qdrant / pgvector] Searching semantic memory in ${collection} for query: ${query}`);
    return [];
  }
}

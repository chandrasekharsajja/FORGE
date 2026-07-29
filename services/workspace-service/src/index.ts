export class WorkspaceService {
  async indexWorkspace(workspaceId: string, repoPaths: string[]): Promise<void> {
    console.log(`[Workspace Service] Indexing workspace ${workspaceId} across repositories: ${repoPaths.join(', ')}`);
  }
}

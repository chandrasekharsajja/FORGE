/**
 * @platform/workspace-service - Multi-repository workspace management
 * 
 * Manages workspaces that can span multiple repositories, track cross-repo
 * relationships, and provide unified view of source code across repos.
 */

import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

// CONTRACTS INTERFACE
import type { OrganizationId, WorkspaceId } from '@sajja/contracts';

export interface RepoInfo {
  name: string;
  url?: string;
  branch?: string;
  localPath?: string;
  status: 'active' | 'stale' | 'error';
  lastSync?: string;
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  name: string;
  organizationId: OrganizationId;
  description?: string;
  repos: RepoInfo[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export class WorkspaceService {
  private workspaces = new Map<WorkspaceId, Workspace>();
  private repoIndex = new Map<string, Set<WorkspaceId>>(); // repo name -> workspace IDs

  constructor() {
    console.log('[WorkspaceService] Initialized');
  }

  /**
   * Create a new workspace with one or more repositories
   */
  async createWorkspace(config: Omit<WorkspaceConfig, 'id' | 'updatedAt'>): Promise<Workspace> {
    const workspaceId = `ws-${uuidv4()}`;
    const now = new Date().toISOString();
    
    const workspace: Workspace = {
      id: workspaceId,
      ...config,
      createdAt: now,
      updatedAt: now,
      repos: config.repos.map(repo => ({
        ...repo,
        status: 'active',
        lastSync: now,
      })),
    };

    this.workspaces.set(workspaceId, workspace);

    // Index repositories
    for (const repo of workspace.repos) {
      if (!this.repoIndex.has(repo.name)) {
        this.repoIndex.set(repo.name, new Set());
      }
      this.repoIndex.get(repo.name)!.add(workspaceId);
    }

    console.log(`[Workspace] Created workspace: ${workspaceId} (${workspace.name})`);
    return workspace;
  }

  /**
   * Get a workspace by ID
   */
  async getWorkspace(id: WorkspaceId): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }

  /**
   * Update an existing workspace (add/remove repos, rename, etc.)
   */
  async updateWorkspace(id: WorkspaceId, updates: Partial<Omit<WorkspaceConfig, 'id'>>): Promise<Workspace | null> {
    const workspace = this.workspaces.get(id);
    if (!workspace) return null;

    const now = new Date().toISOString();
    
    // Update fields
    if (updates.name) workspace.name = updates.name;
    if (updates.description) workspace.description = updates.description;
    if (updates.metadata) workspace.metadata = { ...workspace.metadata, ...updates.metadata };

    // Handle repository changes
    if (updates.repos) {
      await this.updateRepos(id, updates.repos);
    }

    workspace.updatedAt = now;
    this.workspaces.set(id, workspace);

    console.log(`[Workspace] Updated workspace: ${id}`);
    return workspace;
  }

  /**
   * Delete a workspace (removes from index)
   */
  async deleteWorkspace(id: WorkspaceId): Promise<boolean> {
    const workspace = this.workspaces.get(id);
    if (!workspace) return false;

    this.workspaces.delete(id);

    // Remove from repo index
    for (const repo of workspace.repos) {
      const set = this.repoIndex.get(repo.name);
      if (set) {
        set.delete(id);
        if (set.size === 0) {
          this.repoIndex.delete(repo.name);
        }
      }
    }

    console.log(`[Workspace] Deleted: ${id}`);
    return true;
  }

  /**
   * List all workspaces in an organization
   */
  listWorkspacesByOrg(organizationId: OrganizationId): Workspace[] {
    return Array.from(this.workspaces.values()).filter(w => w.organizationId === organizationId);
  }

  /**
   * List all workspaces containing a specific repo
   */
  listWorkspacesByRepo(repoName: string): Workspace[] {
    const ids = this.repoIndex.get(repoName);
    if (!ids) return [];
    return Array.from(ids).map(id => this.workspaces.get(id)!).filter(Boolean);
  }

  /**
   * Scan and synchronize all repositories in a workspace
   */
  async syncWorkspace(id: WorkspaceId): Promise<void> {
    const workspace = this.workspaces.get(id);
    if (!workspace) throw new Error(`Workspace not found: ${id}`);

    console.log(`[Workspace] Syncing workspace: ${id}`);

    for (const repo of workspace.repos) {
      try {
        if (repo.localPath) {
          // Run git status locally
          const output = execSync(`git -C "${repo.localPath}" status --porcelain`, { encoding: 'utf-8' });
          repo.status = output.trim() === '' ? 'active' : 'stale'; // modified files = stale (needs sync)
          repo.lastSync = new Date().toISOString();
        }
      } catch (e) {
        repo.status = 'error';
        console.error(`[Workspace] Error syncing repo ${repo.name}:`, e.message);
      }
    }

    // Save updated workspace state
    workspace.updatedAt = new Date().toISOString();
    this.workspaces.set(id, workspace);
  }

  /**
   * Get cross-repo dependency graph between workspaces
   */
  getCrossRepoGraph(): WorkspaceCrossRepoGraph {
    const graph: WorkspaceCrossRepoGraph = {
      nodes: [],
      edges: [],
    };

    // Collect all unique repos across all workspaces
    const allReps = new Map<string, Set<WorkspaceId>>(); // repo -> set of workspace IDs that have it
    this.workspaces.forEach(ws => {
      ws.repos.forEach(repo => {
        if (!allReps.has(repo.name)) {
          allReps.set(repo.name, new Set());
        }
        allReps.get(repo.name)!.add(ws.id);
      });
    });

    // Build nodes and edges
    for const [repo, workspaceIds] of allReps.entries()) {
      graph.nodes.push({ repo, workspaceCount: workspaceIds.size });
      
      // If multiple workspaces have same repo, create edge between them
      if (workspaceIds.size > 1) {
        const workspaceArray = Array.from(workspaceIds);
        for (let i = 0; i < workspaceArray.length; i++) {
          for (let j = i + 1; j < workspaceArray.length; j++) {
            graph.edges.push({
              source: workspaceArray[i],
              target: workspaceArray[j],
              repo: repo,
              type: 'shared-repo',
            });
          }
        }
      }
    }

    return graph;
  }

  /**
   * Update repositories in a workspace
   */
  private async updateRepos(id: WorkspaceId, newRepos: RepoInfo[]): Promise<void> {
    const workspace = this.workspaces.get(id);
    if (!workspace) return;

    // Old repos to remove from index
    const oldRepoNames = workspace.repos.map(r => r.name);
    
    // Update workspace repos
    workspace.repos = newRepos.map(repo => ({
      ...repo,
      status: 'active',
      lastSync: new Date().toISOString(),
    }));

    // Rebuild index for changed repos
    for (const oldName of oldRepoNames) {
      const set = this.repoIndex.get(oldName);
      if (set) {
        set.delete(id);
        if (set.size === 0) {
          this.repoIndex.delete(oldName);
        }
      }
    }

    // Add new repos to index
    for (const repo of newRepos) {
      if (!this.repoIndex.has(repo.name)) {
        this.repoIndex.set(repo.name, new Set());
      }
      this.repoIndex.get(repo.name)!.add(id);
    }
  }
}

// Workspace model with full state
export interface Workspace extends WorkspaceConfig {
  id: WorkspaceId;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  updatedAt: string;
  repos: RepoInfo[];
}

// Cross-repo graph representation
export interface WorkspaceEdge {
  source: WorkspaceId;
  target: WorkspaceId;
  repo: string;
  type: 'shared-repo' | 'dependency';
}

export interface WorkspaceCrossRepoGraph {
  nodes: { repo: string; workspaceCount: number }[];
  edges: WorkspaceEdge[];
}

// Export singleton
let instance: WorkspaceService | null = null;

export function createWorkspaceService(): WorkspaceService {
  if (!instance) {
    instance = new WorkspaceService();
  }
  return instance;
}

export function getWorkspaceService(): WorkspaceService {
  if (!instance) {
    throw new Error('Workspace service not initialized');
  }
  return instance;
}

export default createWorkspaceService;
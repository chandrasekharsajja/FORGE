/**
 * Integration tests for Workspace Service - validates multi-repo workspace management and cross-repo analysis
 */

import { expect, test, describe, beforeEach } from 'vitest';
import { createWorkspaceService, getWorkspaceService } from '@platform/workspace-service';

describe('Workspace Service - Integration Tests', () => {
  let service: any;

  beforeEach(() => {
    service = createWorkspaceService();
  });

  it('should create workspace with multiple repositories', async () => {
    const workspace = await service.createWorkspace({
      name: 'My Project',
      organizationId: 'org-test',
      description: 'A project with multiple repos',
      repos: [
        { name: 'core', url: 'git://forge-core', branch: 'main' },
        { name: 'api', url: 'git://forge-api', branch: 'main' },
        { name: 'frontend', url: 'git://frontend', branch: 'main' },
      ],
    });

    expect(workspace.id).toBeTruthy();
    expect(workspace.name).toBe('My Project');
    expect(workspace.repos.length).toBe(3);
    expect(workspace.status).toBe('active');
  });

  it('should list workspaces by organization', async () => {
    // Create multiple workspaces for same org
    await service.createWorkspace({ name: 'WS1', organizationId: 'org-x', repos: [] });
    await service.createWorkspace({ name: 'WS2', organizationId: 'org-x', repos: [] });
    await service.createWorkspace({ name: 'WS3', organizationId: 'org-y', repos: [] });

    const orgXWorkspaces = service.listWorkspacesByOrg('org-x');
    expect(orgXWorkspaces.length).toBe(2);
    expect(orgXWorkspaces.map(w => w.name)).toContain('WS1');
    expect(orgXWorkspaces.map(w => w.name)).toContain('WS2');

    const orgYWorkspaces = service.listWorkspacesByOrg('org-y');
    expect(orgYWorkspaces.length).toBe(1);
    expect(orgYWorkspaces[0].name).toBe('WS3');
  });

  it('should find workspaces containing specific repository', async () => {
    // Create two workspaces that both have 'core' repo
    await service.createWorkspace({ name: 'Project A', organizationId: 'org-1', repos: [{ name: 'core', url: '...' }] });
    await service.createWorkspace({ name: 'Project B', organizationId: 'org-2', repos: [{ name: 'core', url: '...' }] });

    const workspacesWithCore = service.listWorkspacesByRepo('core');
    expect(workspacesWithCore.length).toBe(2);
    expect(workspacesWithCore.map(w => w.name)).toContain('Project A');
    expect(workspacesWithCore.map(w => w.name)).toContain('Project B');
  });

  it('should synchronize workspace repository statuses', async () => {
    const workspace = await service.createWorkspace({
      name: 'Sync Test',
      organizationId: 'org-sync',
      repos: [{ name: 'repo1', status: 'active', lastSync: new Date().toISOString() }],
    });

    // Before sync
    expect(workspace.repos[0].status).toBe('active');

    // Simulate sync (in a real test this would run git commands)
    await service.syncWorkspace(workspace.id);
    
    // After sync, status may have changed if there were modifications
    // In our mock implementation, we'd expect the sync to have updated timestamps
    const updatedWorkspace = await service.getWorkspace(workspace.id);
    expect(updatedWorkspace?.repos[0].lastSync).toBeTruthy();
  });

  it('should build cross-repo dependency graph correctly', async () => {
    // Create workspaces with shared repositories
    await service.createWorkspace({
      name: 'AppA',
      organizationId: 'shared-org',
      repos: [{ name: 'common-lib', url: 'git://common-lib' }],
    });

    await service.createWorkspace({
      name: 'AppB',
      organizationId: 'shared-org',
      repos: [{ name: 'common-lib', url: 'git://common-lib' }],
    });

    await service.createWorkspace({
      name: 'AppC',
      organizationId: 'different-org',
      repos: [{ name: 'unique-repo', url: 'git://unique' }],
    });

    const graph = service.getCrossRepoGraph();
    
    // Should show common-lib appearing in multiple workspaces (creates edge between them)
    const commonLibEntry = graph.nodes.find(n => n.repo === 'common-lib');
    expect(commonLibEntry).toBeTruthy();
    expect((commonLibEntry as any).workspaceCount).toBe(2); // Appears in 2 workspaces
    
    // Should have edge between AppA and AppB since they share common-lib
    const edge = graph.edges.find(e => e.repo === 'common-lib');
    expect(edge).toBeTruthy();
    expect(edge.type).toBe('shared-repo');
  });

  it('should update workspace repositories correctly', async () => {
    const ws = await service.createWorkspace({
      name: 'Update Test',
      organizationId: 'org-update',
      repos: [{ name: 'repo1', url: 'git://old' }],
    });

    // Update to add new repo and remove old one
    await service.updateWorkspace(ws.id, {
      repos: [{ name: 'repo1', url: 'git://updated' }, { name: 'repo2', url: 'git://new' }],
    });

    const updatedWs = await service.getWorkspace(ws.id);
    expect(updatedWs?.repos.length).toBe(2);
    expect(updatedWs?.repos[0].url).toBe('git://updated');
    expect(updatedWs?.repos[1].name).toBe('repo2');
  });

  it('should delete workspace and cleanup indexes', async () => {
    const ws = await service.createWorkspace({
      name: 'To Delete',
      organizationId: 'org-del',
      repos: [{ name: 'del-repo', url: 'git://delete-me' }],
    });

    const deleted = await service.deleteWorkspace(ws.id);
    expect(deleted).toBe(true);

    // Verify workspace is gone
    const exists = await service.getWorkspace(ws.id);
    expect(exists).toBeNull());

    // Verify index cleanup (repo should no longer be listed)
    const stillListed = service.listWorkspacesByRepo('del-repo');
    expect(stillListed.length).toBe(0);
  });
});
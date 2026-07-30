import type { MissionContract } from '../../../packages/contracts/src/index.ts';

export interface CloudWorkerNode {
  nodeId: string;
  nodeType: 'laptop' | 'cloud_worker' | 'gpu_node' | 'sandbox_cluster';
  status: 'idle' | 'busy';
  availableGPU: boolean;
}

export class FleetScheduler {
  private workerPool: CloudWorkerNode[] = [
    { nodeId: 'node-gpu-1', nodeType: 'gpu_node', status: 'idle', availableGPU: true },
    { nodeId: 'node-sandbox-1', nodeType: 'sandbox_cluster', status: 'idle', availableGPU: false }
  ];

  async scheduleMissionTask(mission: MissionContract, taskName: string): Promise<CloudWorkerNode> {
    console.log(`[Fleet Scheduler] Scheduling task '${taskName}' for mission ${mission.id}...`);
    const worker = this.workerPool.find((w) => w.status === 'idle') ?? this.workerPool[0];

    if (!worker) {
      throw new Error('No worker nodes are available');
    }

    console.log(`[Fleet Scheduler] Assigned task to worker node: ${worker.nodeId} (${worker.nodeType})`);
    return worker;
  }
}

/**
 * @core-agent/state - Agent state management utilities
 * 
 Provides typed state interfaces and helper functions for managing agent lifecycle states.
 */

export interface MissionState {
  id: string;
  goal: string;
  title?: string;
  status: 'draft' | 'planning' | 'scheduling' | 'executing' | 'verifying' | 'completed' | 'failed';
  organizationId?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum ExecutionStatus {
  Draft = 'draft',
  Planning = 'planning',
  Scheduling = 'scheduling',
  Executing = 'executing',
  Verifying = 'verifying',
  Completed = 'completed',
  Failed = 'failed',
}

// State transition map - which states can transition to which
const stateTransitions: Record<MissionState['status'], MissionState['status']> = {
  draft: ['planning'],
  planning: ['scheduling', 'failed'],
  scheduling: ['executing'],
  executing: ['verifying', 'failed'],
  verifying: ['completed', 'failed'],
  completed: [], // terminal state
  failed: ['recovery', 'abort'], // can optionally attempt recovery
};

/** Check if a transition is valid */
export function isValidTransition(from: MissionState['status'], to: MissionState['status']): boolean {
  return !!(stateTransitions[from] && stateTransitions[from].includes(to));
}

/** Get all possible next states from current state */
export function getPossibleNextStates(currentState: MissionState['status']): MissionState['status'][] {
  return stateTransitions[currentState] || [];
}

/** Format mission state display name */
export function formatMissionState(status: MissionState['status']): string {
  const labels: Record<MissionState['status'], string> = {
    draft: 'Draft',
    planning: 'Planning',
    scheduling: 'Scheduling',
    executing: 'Executing',
    verifying: 'Verifying',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status] || status;
}

/** Create initial mission state */
export function createInitialState(missionId: string, goal: string): MissionState {
  return {
    id: missionId,
    goal,
    title: '',
    status: 'draft',
    organizationId: undefined,
    ownerId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: undefined,
  };
}

export default { isValidTransition, getPossibleNextStates, formatMissionState, createInitialState };
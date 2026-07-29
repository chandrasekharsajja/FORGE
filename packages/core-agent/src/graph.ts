import { AgentState } from './state';

export async function runPlannerStep(state: AgentState): Promise<Partial<AgentState>> {
  const thought = `[Planner]: Analyzing prompt "${state.userPrompt}" and outlining execution steps.`;
  const initialPlan = [
    "1. Inspect existing repository structure",
    "2. Generate component/logic changes",
    "3. Run automated tests and code verification",
    "4. Review final diffs and submit task"
  ];
  return {
    plan: initialPlan,
    currentStepIndex: 0,
    thoughtStream: [...state.thoughtStream, thought]
  };
}

export async function runCoderStep(state: AgentState): Promise<Partial<AgentState>> {
  const step = state.plan[state.currentStepIndex] || "Executing step";
  const thought = `[Coder]: Implementing changes for plan step: ${step}`;
  return {
    thoughtStream: [...state.thoughtStream, thought]
  };
}

export async function runReviewerStep(state: AgentState): Promise<Partial<AgentState>> {
  const thought = `[Reviewer]: Reviewing code changes for compliance and safety.`;
  return {
    thoughtStream: [...state.thoughtStream, thought]
  };
}

export async function runTesterStep(state: AgentState): Promise<Partial<AgentState>> {
  const nextStepIndex = state.currentStepIndex + 1;
  const isCompleted = nextStepIndex >= state.plan.length;
  const thought = isCompleted
    ? `[Tester]: All verification checks passed. Task completed!`
    : `[Tester]: Step verified. Moving to step ${nextStepIndex + 1}`;

  return {
    currentStepIndex: nextStepIndex,
    isCompleted,
    thoughtStream: [...state.thoughtStream, thought]
  };
}

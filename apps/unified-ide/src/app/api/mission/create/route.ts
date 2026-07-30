/**
 * /api/mission/create - Create a new mission with validation and auth
 * 
 Protected endpoint requiring authenticated user with proper permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withValidation } from '@/lib/validation-middleware';
import { authenticate, createContext } from '@/lib/auth-middleware';
import { getPolicyEngine } from '@platform/policy-engine';
import { createMissionRuntime } from '@mission-runtime';
import { planMission } from '@core-agent/planner'; // From core-agent package

// Import Zod schema for mission creation (defined in contracts/validation-schemas.ts)
import { MissionCreateSchema } from '@sajja/contracts';

// Protected POST handler for creating missions
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate user
    const context = await authenticate(request, 'editor'); // Requires at least editor role
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Step 2: Validate input payload using Zod schema
    const body = await request.json();
    const validated = MissionCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid mission data', 
          details: formatZodErrors(validated.error) 
        },
        { status: 400 }
      );
    }

    const missionData = validated.data;

    // Step 3: Check policy authorization before proceeding
    const policy = getPolicyEngine();
    const policyResult = await policy.evaluateAction('create_mission', {
      organizationId: context.organizationId || '',
      userId: context.userId,
      workspaceId: context.workspaceId,
    });

    if (!policyResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Policy violation', 
          reason: policyResult.reason 
        },
        { status: 403 }
      );
    }

    // Step 4: Generate unique mission ID
    const missionId = `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Step 5: Create mission object with initial state
    const mission = {
      id: missionId,
      title: missionData.title,
      goal: missionData.goal,
      organizationId: context.organizationId,
      ownerId: context.userId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      agentRole: context.role as any, // Simplified - would need mapping
      estimatedDurationMs: calculateEstimatedDuration(missionData.goal),
    };

    // Step 6: Plan the mission using AI-powered planner
    const plan = await planMission(missionData.goal, {
      organizationId: context.organizationId,
      constraints: missionData.constraints,
    });

    // Step 7: Save mission to persistence (would call database service)
    const missionRuntime = createMissionRuntime();
    const savedMission = await missionRuntime.saveMission(mission, plan);

    // Step 8: Publish mission created event to event bus (for downstream processing)
    import('@platform/event-bus').then(async ({ createEventBus }) => {
      const eventBus = createEventBus();
      await eventBus.publishAgentEvent('mission.created', {
        missionId: savedMission.id,
        organizationId: savedMission.organizationId,
        userId: context.userId,
        goal: savedMission.goal,
      });
    }); // Fire and forget - don't block response

    // Step 9: Return successful response
    return NextResponse.json({
      success: true,
      data: {
        mission: {
          id: savedMission.id,
          title: savedMission.title,
          goal: savedMission.goal,
          organizationId: savedMission.organizationId,
          status: savedMission.status,
          createdAt: savedMission.createdAt,
          estimatedDurationMs: savedMission.estimatedDurationMs,
        },
        planning: {
          planId: plan.id,
          steps: plan.steps,
          estimatedCompletionMs: plan.estimatedCompletionMs,
        },
      },
    });
  } catch (error) {
    console.error('Mission creation failed:', error);
    
    // Check for specific validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to estimate mission duration based on complexity
function calculateEstimatedDuration(goal: string): number {
  const lower = goal.toLowerCase();
  
  // Simple heuristics for estimation (would use ML model in production)
  if (lower.includes('simple') || lower.includes('todo') || lower.includes('bug')) return 180000; // 3 min
  if (lower.includes('api') || lower.includes('endpoint') || lower.includes('crud')) return 720000; // 12 min
  if (lower.includes('frontend') || lower.includes('ui') || lower.includes('component')) return 1800000; // 30 min
  if (lower.includes('database') || lower.includes('schema') || lower.includes('migration')) return 1080000; // 18 min
  if (lower.includes('authentication') || lower.includes('authorization') || lower.includes('security')) return 2160000; // 36 min
  
  // Default fallback
  return 720000; // 12 minutes default estimate
}

// GET health check endpoint
export async function GET() {
  return NextResponse.json({ 
    success: true,
    service: 'mission-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

// Format Zod errors helper
function formatZodErrors(errors: any): string {
  return errors.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') || 'Unknown validation error';
}
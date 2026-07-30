import { runMissionPrompt } from '../../../lib/dashboard-model.ts';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 });
  }

  const result = await runMissionPrompt(prompt);
  return Response.json(result);
}

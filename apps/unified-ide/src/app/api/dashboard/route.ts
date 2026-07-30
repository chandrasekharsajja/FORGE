import { buildDashboardSnapshot } from '../../../lib/dashboard-model.ts';

export async function GET() {
  const snapshot = await buildDashboardSnapshot();
  return Response.json(snapshot);
}

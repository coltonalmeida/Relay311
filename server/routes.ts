import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { CreateCallSchema } from '../shared/schemas.js';
import { createCall, getCall, getCalls, getIncident, getIncidents, setIncidentStatus } from './services/calls.js';

export const router = Router();
const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res, next) => {
  void fn(req, res).catch(next);
};
const RouteIdSchema = z.string().uuid();
function routeId(value: string | string[] | undefined, res: Response): string | null {
  const parsed = RouteIdSchema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: { id: ['Expected a UUID'] } });
    return null;
  }
  return parsed.data;
}
router.post('/calls', asyncRoute(async (req, res) => {
  const parsed = CreateCallSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  try { return res.status(201).json(await createCall(parsed.data)); }
  catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Call processing failed' }); }
}));
router.get('/calls', asyncRoute(async (_req, res) => {
  try { return res.json(await getCalls()); } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' }); }
}));
router.get('/calls/:id', asyncRoute(async (req, res) => {
  const id = routeId(req.params.id, res);
  if (!id) return;
  try { const call = await getCall(id); return call ? res.json(call) : res.status(404).json({ error: 'Call not found' }); }
  catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' }); }
}));
router.get('/incidents', asyncRoute(async (_req, res) => {
  try { return res.json(await getIncidents()); } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' }); }
}));
router.get('/incidents/:id', asyncRoute(async (req, res) => {
  const id = routeId(req.params.id, res);
  if (!id) return;
  try { const incident = await getIncident(id); return incident ? res.json(incident) : res.status(404).json({ error: 'Incident not found' }); }
  catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' }); }
}));
for (const [action, status] of [['approve', 'approved'], ['dismiss', 'dismissed']] as const) {
  router.post(`/incidents/:id/${action}`, asyncRoute(async (req, res) => {
    const id = routeId(req.params.id, res);
    if (!id) return;
    try { const incident = await setIncidentStatus(id, status); return incident ? res.json(incident) : res.status(404).json({ error: 'Incident not found' }); }
    catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : 'Database error' }); }
  }));
}

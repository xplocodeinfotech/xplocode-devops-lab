import { Router } from 'express';

export function studentRoutes(students, auth) {
  const router = Router();
  router.use('/students', (req, _res, next) => {
    // X-Access-Token is the contract header: Zoho Catalyst's gateway rejects any Authorization header it cannot validate.
    // Authorization: Bearer is still accepted for hosts without that restriction.
    const header = req.headers.authorization ?? '';
    auth.verify(req.headers['x-access-token'] ?? (header.startsWith('Bearer ') ? header.slice(7) : ''));
    next();
  });
  router.get('/students', async (_req, res) => res.json(await students.list()));
  router.post('/students', async (req, res) => res.status(201).json(await students.create(req.body)));
  router.get('/students/:id', async (req, res) => res.json(await students.get(req.params.id)));
  router.put('/students/:id', async (req, res) => res.json(await students.update(req.params.id, req.body)));
  router.delete('/students/:id', async (req, res) => { await students.remove(req.params.id); res.status(204).end(); });
  return router;
}

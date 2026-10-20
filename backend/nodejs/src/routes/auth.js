import { Router } from 'express';

export const authRoutes = (auth) => Router().post('/auth/login', async (req, res) => {
  res.json(await auth.login(req.body?.username, req.body?.password));
});

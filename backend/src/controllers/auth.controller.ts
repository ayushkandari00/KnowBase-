import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { requireUser } from '../middleware/auth.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas.js';

export async function register(req: Request, res: Response): Promise<void> {
  res.status(201).json(await authService.register(req.body as RegisterInput));
}

export async function login(req: Request, res: Response): Promise<void> {
  res.json(await authService.login(req.body as LoginInput));
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: await authService.getCurrentUser(requireUser(req).id) });
}

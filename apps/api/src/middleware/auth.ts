import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@clinic/shared';
import { AppError } from '../lib/errors';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticação não informado'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.auth = payload;
    return next();
  } catch {
    return next(new AppError(401, 'Token de autenticação inválido ou expirado'));
  }
}

export function requireRole(role: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError(401, 'Não autenticado'));
    }
    if (req.auth.role !== role) {
      return next(new AppError(403, 'Acesso negado para o seu perfil'));
    }
    return next();
  };
}

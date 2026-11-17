import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema, registerPatientSchema, UserRole } from '@clinic/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { authenticate, getJwtSecret } from '../middleware/auth';

export const authRouter = Router();

function signToken(user: { id: string; role: string; email: string }) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: '12h' },
  );
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerPatientSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'Já existe uma conta cadastrada com este e-mail');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: UserRole.PATIENT,
        phone: data.phone ?? null,
        patientProfile: {
          create: {
            documentId: data.documentId || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          },
        },
      },
      select: { id: true, email: true, fullName: true, role: true, phone: true },
    });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError(401, 'E-mail ou senha inválidos');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'E-mail ou senha inválidos');
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, email: true, fullName: true, role: true, phone: true },
    });
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

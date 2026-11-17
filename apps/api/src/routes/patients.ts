import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createPatientSchema, UserRole } from '@clinic/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { authenticate, requireRole } from '../middleware/auth';

export const patientsRouter = Router();

patientsRouter.use(authenticate, requireRole(UserRole.STAFF));

patientsRouter.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const patients = await prisma.user.findMany({
      where: {
        role: UserRole.PATIENT,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        patientProfile: {
          select: {
            dateOfBirth: true,
            documentId: true,
          },
        },
      },
    });
    res.json({ patients });
  } catch (err) {
    next(err);
  }
});

patientsRouter.post('/', async (req, res, next) => {
  try {
    const data = createPatientSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError(409, 'Já existe um paciente cadastrado com este e-mail');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const patient = await prisma.user.create({
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
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        patientProfile: {
          select: {
            dateOfBirth: true,
            documentId: true,
          },
        },
      },
    });

    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

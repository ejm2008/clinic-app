import { Router } from 'express';
import { Prisma } from '@prisma/client';
import {
  AppointmentStatus,
  createAppointmentSchema,
  EXAM_DURATION_MINUTES,
  ExamType,
  updateAppointmentStatusSchema,
  UserRole,
} from '@clinic/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { authenticate, requireRole } from '../middleware/auth';

export const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

appointmentsRouter.get('/', async (req, res, next) => {
  try {
    const where: Prisma.AppointmentWhereInput = {};

    if (req.auth!.role === UserRole.PATIENT) {
      where.patientId = req.auth!.userId;
    } else {
      if (typeof req.query.patientId === 'string' && req.query.patientId) {
        where.patientId = req.query.patientId;
      }
      if (
        typeof req.query.examType === 'string' &&
        Object.values(ExamType).includes(req.query.examType as ExamType)
      ) {
        where.examType = req.query.examType as ExamType;
      }
      if (typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        const dayStart = new Date(`${req.query.date}T00:00:00.000`);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        where.scheduledStart = { gte: dayStart, lt: dayEnd };
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledStart: 'asc' },
      include: {
        patient: {
          select: { id: true, fullName: true, email: true },
        },
        medicalReport: {
          select: { id: true, status: true, publishedAt: true },
        },
      },
    });

    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post('/', requireRole(UserRole.STAFF), async (req, res, next) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    const scheduledStart = new Date(data.scheduledStart);
    const now = new Date();

    if (scheduledStart.getTime() < now.getTime()) {
      throw new AppError(400, 'Não é permitido criar agendamento anterior à data e horário atuais');
    }

    const scheduledEnd = new Date(scheduledStart.getTime() + EXAM_DURATION_MINUTES * 60 * 1000);

    const patient = await prisma.user.findUnique({
      where: { id: data.patientId },
      select: { id: true, role: true },
    });
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new AppError(404, 'Paciente cadastrado não encontrado');
    }

    const appointment = await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            status: { not: AppointmentStatus.CANCELLED },
            scheduledStart: { lt: scheduledEnd },
            scheduledEnd: { gt: scheduledStart },
          },
          select: { id: true, scheduledStart: true, scheduledEnd: true },
        });

        if (conflict) {
          throw new AppError(
            409,
            'Horário indisponível: a sala já está ocupada neste intervalo de 30 minutos',
          );
        }

        return tx.appointment.create({
          data: {
            patientId: data.patientId,
            examType: data.examType,
            scheduledStart,
            scheduledEnd,
            notes: data.notes ?? null,
          },
          include: {
            patient: {
              select: { id: true, fullName: true, email: true },
            },
            medicalReport: {
              select: { id: true, status: true, publishedAt: true },
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.patch('/:id/status', requireRole(UserRole.STAFF), async (req, res, next) => {
  try {
    const { status } = updateAppointmentStatusSchema.parse(req.body);
    const existing = await prisma.appointment.findUnique({
      where: { id: String(req.params.id) },
      include: { medicalReport: { select: { id: true, status: true } } },
    });

    if (!existing) {
      throw new AppError(404, 'Agendamento não encontrado');
    }

    if (
      status === AppointmentStatus.CANCELLED &&
      existing.medicalReport?.status === 'PUBLISHED'
    ) {
      throw new AppError(409, 'Agendamento com laudo publicado não pode ser cancelado');
    }

    const now = new Date();
    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status,
        checkedInAt:
          status === AppointmentStatus.IN_PROGRESS && !existing.checkedInAt
            ? now
            : existing.checkedInAt,
        completedAt: status === AppointmentStatus.COMPLETED ? now : existing.completedAt,
        cancelledAt: status === AppointmentStatus.CANCELLED ? now : existing.cancelledAt,
      },
      include: {
        patient: {
          select: { id: true, fullName: true, email: true },
        },
        medicalReport: {
          select: { id: true, status: true, publishedAt: true },
        },
      },
    });

    res.json({ appointment });
  } catch (err) {
    next(err);
  }
});

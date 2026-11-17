import { Router } from 'express';
import {
  AppointmentStatus,
  createReportSchema,
  ReportStatus,
  updateReportSchema,
  UserRole,
} from '@clinic/shared';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { authenticate, requireRole } from '../middleware/auth';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get('/', async (req, res, next) => {
  try {
    const isPatient = req.auth!.role === UserRole.PATIENT;
    const reports = await prisma.medicalReport.findMany({
      where: isPatient
        ? { patientId: req.auth!.userId, status: ReportStatus.PUBLISHED }
        : undefined,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        patient: {
          select: { id: true, fullName: true },
        },
        appointment: {
          select: {
            id: true,
            examType: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/:id', async (req, res, next) => {
  try {
    const report = await prisma.medicalReport.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          select: { id: true, fullName: true },
        },
        appointment: {
          select: {
            id: true,
            examType: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError(404, 'Laudo não encontrado');
    }

    if (req.auth!.role === UserRole.PATIENT) {
      if (report.patientId !== req.auth!.userId || report.status !== ReportStatus.PUBLISHED) {
        throw new AppError(403, 'Você não tem permissão para visualizar este laudo');
      }
    }

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

reportsRouter.post('/', requireRole(UserRole.STAFF), async (req, res, next) => {
  try {
    const data = createReportSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { medicalReport: { select: { id: true } } },
    });

    if (!appointment) {
      throw new AppError(404, 'Agendamento não encontrado');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError(409, 'Agendamentos cancelados não podem receber laudos');
    }

    if (appointment.medicalReport) {
      throw new AppError(409, 'Este agendamento já possui um laudo vinculado');
    }

    const report = await prisma.medicalReport.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        authoredById: req.auth!.userId,
        title: data.title,
        content: data.content,
        responsibleName: data.responsibleName,
        status: data.status,
        publishedAt: data.status === ReportStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        patient: {
          select: { id: true, fullName: true },
        },
        appointment: {
          select: {
            id: true,
            examType: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});

reportsRouter.patch('/:id', requireRole(UserRole.STAFF), async (req, res, next) => {
  try {
    const data = updateReportSchema.parse(req.body);
    const existing = await prisma.medicalReport.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      throw new AppError(404, 'Laudo não encontrado');
    }

    if (existing.status === ReportStatus.PUBLISHED) {
      throw new AppError(409, 'Laudo já publicado não pode ser editado');
    }

    const nextStatus = data.status ?? existing.status;
    const report = await prisma.medicalReport.update({
      where: { id: existing.id },
      data: {
        title: data.title ?? existing.title,
        content: data.content ?? existing.content,
        responsibleName: data.responsibleName ?? existing.responsibleName,
        status: nextStatus,
        publishedAt: nextStatus === ReportStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        patient: {
          select: { id: true, fullName: true },
        },
        appointment: {
          select: {
            id: true,
            examType: true,
            scheduledStart: true,
            status: true,
          },
        },
      },
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

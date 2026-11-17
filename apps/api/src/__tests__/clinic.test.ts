import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppointmentStatus, ExamType, ReportStatus, UserRole } from '@clinic/shared';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../middleware/auth';

jest.mock('../lib/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    medicalReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) =>
    callback(mockPrisma),
  );

  return { prisma: mockPrisma };
});

const app = createApp();

const staffId = '11111111-1111-4111-8111-111111111111';
const patientId = '22222222-2222-4222-8222-222222222222';
const otherPatientId = '33333333-3333-4333-8333-333333333333';
const appointmentId = '44444444-4444-4444-8444-444444444444';
const reportId = '55555555-5555-4555-8555-555555555555';

function makeToken(userId: string, role: UserRole, email: string) {
  return jwt.sign({ userId, role, email }, getJwtSecret(), { expiresIn: '1h' });
}

const staffToken = makeToken(staffId, UserRole.STAFF, 'equipe@clinica.com');
const patientToken = makeToken(patientId, UserRole.PATIENT, 'joao@paciente.com');
const otherPatientToken = makeToken(otherPatientId, UserRole.PATIENT, 'maria@paciente.com');

describe('Clinic API — Regras de Agendamento e Laudos', () => {
  it('bloqueia criação e cancelamento de agendamentos por paciente (403)', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        patientId,
        examType: ExamType.RAIO_X,
        scheduledStart: futureDate,
      });

    expect(createRes.status).toBe(403);

    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: AppointmentStatus.CANCELLED });

    expect(cancelRes.status).toBe(403);
  });

  it('rejeita agendamento com data/horário anterior ao momento atual (400)', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientId,
        examType: ExamType.ULTRASSOM,
        scheduledStart: pastDate,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/anterior/i);
  });

  it('rejeita conflito de sala única no mesmo intervalo de 30 minutos (409)', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: patientId,
      role: UserRole.PATIENT,
    });
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-appt',
      scheduledStart: new Date(futureDate),
      scheduledEnd: new Date(new Date(futureDate).getTime() + 30 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientId,
        examType: ExamType.RESSONANCIA_MAGNETICA,
        scheduledStart: futureDate,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/sala/i);
  });

  it('cria agendamento com duração fixa de 30 minutos quando sala está livre', async () => {
    const start = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const expectedEnd = new Date(start.getTime() + 30 * 60 * 1000);

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: patientId,
      role: UserRole.PATIENT,
    });
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      id: appointmentId,
      patientId,
      examType: ExamType.RAIO_X,
      status: AppointmentStatus.SCHEDULED,
      scheduledStart: start,
      scheduledEnd: expectedEnd,
    });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientId,
        examType: ExamType.RAIO_X,
        scheduledStart: start.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledStart: start,
          scheduledEnd: expectedEnd,
        }),
      }),
    );
  });

  it('bloqueia criação de laudo em agendamento cancelado (409)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: appointmentId,
      patientId,
      status: AppointmentStatus.CANCELLED,
      medicalReport: null,
    });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        appointmentId,
        title: 'Laudo Raio-X',
        content: 'Sem alterações.',
        responsibleName: 'Dra. Ana Paula',
        status: ReportStatus.DRAFT,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/cancelados/i);
  });

  it('bloqueia edição de laudo já publicado (409)', async () => {
    (prisma.medicalReport.findUnique as jest.Mock).mockResolvedValue({
      id: reportId,
      appointmentId,
      patientId,
      status: ReportStatus.PUBLISHED,
      publishedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ title: 'Tentativa de alteração' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/publicado/i);
  });

  it('bloqueia cancelamento de agendamento com laudo publicado (409)', async () => {
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({
      id: appointmentId,
      patientId,
      status: AppointmentStatus.COMPLETED,
      medicalReport: { id: reportId, status: ReportStatus.PUBLISHED },
    });

    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: AppointmentStatus.CANCELLED });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/laudo publicado/i);
  });

  it('bloqueia paciente de visualizar rascunho de laudo (403)', async () => {
    (prisma.medicalReport.findUnique as jest.Mock).mockResolvedValue({
      id: reportId,
      appointmentId,
      patientId,
      status: ReportStatus.DRAFT,
      title: 'Rascunho',
      content: 'Em análise',
      responsibleName: 'Dra. Ana Paula',
    });

    const res = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('bloqueia paciente de visualizar laudo publicado de outro paciente (403)', async () => {
    (prisma.medicalReport.findUnique as jest.Mock).mockResolvedValue({
      id: reportId,
      appointmentId,
      patientId: otherPatientId,
      status: ReportStatus.PUBLISHED,
      title: 'Laudo',
      content: 'Texto',
      responsibleName: 'Dra. Ana Paula',
      publishedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('aceita apenas o primeiro agendamento quando há duas tentativas para o mesmo horário (201 e 409)', async () => {
    const start = new Date(Date.now() + 96 * 60 * 60 * 1000);
    const expectedEnd = new Date(start.getTime() + 30 * 60 * 1000);

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: patientId,
      role: UserRole.PATIENT,
    });
    (prisma.appointment.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: appointmentId,
        scheduledStart: start,
        scheduledEnd: expectedEnd,
      });
    (prisma.appointment.create as jest.Mock).mockResolvedValueOnce({
      id: appointmentId,
      patientId,
      examType: ExamType.RAIO_X,
      status: AppointmentStatus.SCHEDULED,
      scheduledStart: start,
      scheduledEnd: expectedEnd,
    });

    const firstRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientId,
        examType: ExamType.RAIO_X,
        scheduledStart: start.toISOString(),
      });

    const secondRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        patientId,
        examType: ExamType.ULTRASSOM,
        scheduledStart: start.toISOString(),
      });

    expect(firstRes.status).toBe(201);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.message).toMatch(/horário indisponível|sala/i);
  });

  it('publica laudo e o torna disponível apenas para o paciente especificado (200 e 403)', async () => {
    const publishedAt = new Date();
    const draftReport = {
      id: reportId,
      appointmentId,
      patientId,
      authoredById: staffId,
      title: 'Laudo de Ultrassom',
      content: 'Exame dentro da normalidade.',
      responsibleName: 'Dra. Ana Paula',
      status: ReportStatus.DRAFT,
      publishedAt: null,
    };
    const publishedReport = {
      ...draftReport,
      status: ReportStatus.PUBLISHED,
      publishedAt,
    };

    (prisma.medicalReport.findUnique as jest.Mock).mockResolvedValue(draftReport);
    (prisma.medicalReport.update as jest.Mock).mockResolvedValue(publishedReport);

    const publishRes = await request(app)
      .patch(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: ReportStatus.PUBLISHED });

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.report.status).toBe(ReportStatus.PUBLISHED);

    (prisma.medicalReport.findUnique as jest.Mock).mockResolvedValue(publishedReport);

    const ownerRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.report.id).toBe(reportId);

    const otherRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherPatientToken}`);

    expect(otherRes.status).toBe(403);
  });
});

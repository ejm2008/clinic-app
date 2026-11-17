import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, ExamType, AppointmentStatus, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staffPassword = await bcrypt.hash('staff123', 10);
  const patientPassword = await bcrypt.hash('paciente123', 10);

  const staff = await prisma.user.upsert({
    where: { email: 'equipe@clinica.com' },
    update: {},
    create: {
      email: 'equipe@clinica.com',
      passwordHash: staffPassword,
      fullName: 'Dra. Ana Paula Souza',
      role: UserRole.STAFF,
      phone: '(11) 99999-0001',
    },
  });

  const patient1 = await prisma.user.upsert({
    where: { email: 'joao@paciente.com' },
    update: {},
    create: {
      email: 'joao@paciente.com',
      passwordHash: patientPassword,
      fullName: 'João Carlos Silva',
      role: UserRole.PATIENT,
      phone: '(11) 98888-1111',
      patientProfile: {
        create: {
          documentId: '123.456.789-00',
          dateOfBirth: new Date('1990-05-14'),
        },
      },
    },
  });

  const patient2 = await prisma.user.upsert({
    where: { email: 'maria@paciente.com' },
    update: {},
    create: {
      email: 'maria@paciente.com',
      passwordHash: patientPassword,
      fullName: 'Maria Fernanda Oliveira',
      role: UserRole.PATIENT,
      phone: '(11) 97777-2222',
      patientProfile: {
        create: {
          documentId: '987.654.321-11',
          dateOfBirth: new Date('1985-09-22'),
        },
      },
    },
  });

  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const appt1End = new Date(tomorrow.getTime() + 30 * 60 * 1000);

    const appt2Start = new Date(tomorrow.getTime() + 60 * 60 * 1000);
    const appt2End = new Date(appt2Start.getTime() + 30 * 60 * 1000);

    const appt1 = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        examType: ExamType.RAIO_X,
        status: AppointmentStatus.COMPLETED,
        scheduledStart: tomorrow,
        scheduledEnd: appt1End,
        checkedInAt: tomorrow,
        completedAt: appt1End,
        notes: 'Exame de tórax PA e perfil',
      },
    });

    const appt2 = await prisma.appointment.create({
      data: {
        patientId: patient2.id,
        examType: ExamType.ULTRASSOM,
        status: AppointmentStatus.SCHEDULED,
        scheduledStart: appt2Start,
        scheduledEnd: appt2End,
        notes: 'Ultrassonografia abdominal total',
      },
    });

    await prisma.medicalReport.create({
      data: {
        appointmentId: appt1.id,
        patientId: patient1.id,
        authoredById: staff.id,
        title: 'Laudo de Radiografia de Tórax',
        content:
          'Campos pulmonares com transparência normal, sem sinais de consolidações ou derrame pleural. Área cardíaca dentro dos limites da normalidade.',
        responsibleName: 'Dra. Ana Paula Souza (CRM-SP 123456)',
        status: ReportStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await prisma.medicalReport.create({
      data: {
        appointmentId: appt2.id,
        patientId: patient2.id,
        authoredById: staff.id,
        title: 'Rascunho — Ultrassonografia Abdominal',
        content: 'Aguardando revisão final das imagens antes da liberação ao paciente.',
        responsibleName: 'Dr. Roberto Lima (CRM-SP 654321)',
        status: ReportStatus.DRAFT,
      },
    });
  }

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

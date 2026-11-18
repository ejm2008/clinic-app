import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, ReportStatus } from '@prisma/client';
import {
  SEED_APPOINTMENTS,
  SEED_PASSWORDS,
  SEED_PATIENTS,
  SEED_STAFF,
  SeedPatientKey,
} from './seed-data';

const prisma = new PrismaClient();

async function main() {
  const staffPassword = await bcrypt.hash(SEED_PASSWORDS.staff, 10);
  const patientPassword = await bcrypt.hash(SEED_PASSWORDS.patient, 10);

  const staff = await prisma.user.upsert({
    where: { email: SEED_STAFF.email },
    update: {},
    create: {
      email: SEED_STAFF.email,
      passwordHash: staffPassword,
      fullName: SEED_STAFF.fullName,
      role: SEED_STAFF.role,
      phone: SEED_STAFF.phone,
    },
  });

  const patientsByKey = {} as Record<SeedPatientKey, { id: string }>;

  for (const patientData of SEED_PATIENTS) {
    const patient = await prisma.user.upsert({
      where: { email: patientData.email },
      update: {},
      create: {
        email: patientData.email,
        passwordHash: patientPassword,
        fullName: patientData.fullName,
        role: patientData.role,
        phone: patientData.phone,
        patientProfile: {
          create: {
            documentId: patientData.patientProfile.documentId,
            dateOfBirth: patientData.patientProfile.dateOfBirth,
          },
        },
      },
    });
    patientsByKey[patientData.key] = patient;
  }

  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    for (const item of SEED_APPOINTMENTS) {
      const patient = patientsByKey[item.patientKey];
      const scheduledStart = new Date(
        tomorrow.getTime() + item.offsetMinutesFromBase * 60 * 1000,
      );
      const scheduledEnd = new Date(
        scheduledStart.getTime() + item.durationMinutes * 60 * 1000,
      );

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          examType: item.examType,
          status: item.status,
          scheduledStart,
          scheduledEnd,
          checkedInAt: item.hasCheckInAndCompletion ? scheduledStart : null,
          completedAt: item.hasCheckInAndCompletion ? scheduledEnd : null,
          notes: item.notes,
        },
      });

      await prisma.medicalReport.create({
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          authoredById: staff.id,
          title: item.report.title,
          content: item.report.content,
          responsibleName: item.report.responsibleName,
          status: item.report.status,
          publishedAt: item.report.status === ReportStatus.PUBLISHED ? new Date() : null,
        },
      });
    }
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

import { AppointmentStatus, ExamType, ReportStatus, UserRole } from '@prisma/client';

export const SEED_PASSWORDS = {
  staff: 'staff123',
  patient: 'paciente123',
} as const;

export const SEED_STAFF = {
  email: 'equipe@clinica.com',
  fullName: 'Dra. Ana Paula Souza',
  role: UserRole.STAFF,
  phone: '(11) 99999-0001',
} as const;

export const SEED_PATIENTS = [
  {
    key: 'joao',
    email: 'joao@paciente.com',
    fullName: 'João Carlos Silva',
    role: UserRole.PATIENT,
    phone: '(11) 98888-1111',
    patientProfile: {
      documentId: '123.456.789-00',
      dateOfBirth: new Date('1990-05-14'),
    },
  },
  {
    key: 'maria',
    email: 'maria@paciente.com',
    fullName: 'Maria Fernanda Oliveira',
    role: UserRole.PATIENT,
    phone: '(11) 97777-2222',
    patientProfile: {
      documentId: '987.654.321-11',
      dateOfBirth: new Date('1985-09-22'),
    },
  },
] as const;

export type SeedPatientKey = (typeof SEED_PATIENTS)[number]['key'];

export interface SeedAppointmentWithReport {
  patientKey: SeedPatientKey;
  examType: ExamType;
  status: AppointmentStatus;
  offsetMinutesFromBase: number;
  durationMinutes: number;
  hasCheckInAndCompletion?: boolean;
  notes: string;
  report: {
    title: string;
    content: string;
    responsibleName: string;
    status: ReportStatus;
  };
}

export const SEED_APPOINTMENTS: SeedAppointmentWithReport[] = [
  {
    patientKey: 'joao',
    examType: ExamType.RAIO_X,
    status: AppointmentStatus.COMPLETED,
    offsetMinutesFromBase: 0,
    durationMinutes: 30,
    hasCheckInAndCompletion: true,
    notes: 'Exame de tórax PA e perfil',
    report: {
      title: 'Laudo de Radiografia de Tórax',
      content:
        'Campos pulmonares com transparência normal, sem sinais de consolidações ou derrame pleural. Área cardíaca dentro dos limites da normalidade.',
      responsibleName: 'Dra. Ana Paula Souza (CRM-SP 123456)',
      status: ReportStatus.PUBLISHED,
    },
  },
  {
    patientKey: 'maria',
    examType: ExamType.ULTRASSOM,
    status: AppointmentStatus.SCHEDULED,
    offsetMinutesFromBase: 60,
    durationMinutes: 30,
    notes: 'Ultrassonografia abdominal total',
    report: {
      title: 'Rascunho — Ultrassonografia Abdominal',
      content: 'Aguardando revisão final das imagens antes da liberação ao paciente.',
      responsibleName: 'Dr. Roberto Lima (CRM-SP 654321)',
      status: ReportStatus.DRAFT,
    },
  },
];

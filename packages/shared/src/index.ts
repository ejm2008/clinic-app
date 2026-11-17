import { z } from 'zod';

export const EXAM_DURATION_MINUTES = 30;

export const UserRole = {
  PATIENT: 'PATIENT',
  STAFF: 'STAFF',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ExamType = {
  RAIO_X: 'RAIO_X',
  ULTRASSOM: 'ULTRASSOM',
  RESSONANCIA_MAGNETICA: 'RESSONANCIA_MAGNETICA',
} as const;
export type ExamType = (typeof ExamType)[keyof typeof ExamType];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  RAIO_X: 'Raio-X',
  ULTRASSOM: 'Ultrassom',
  RESSONANCIA_MAGNETICA: 'Ressonância Magnética',
};

export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const ReportStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
};

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export const registerPatientSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  documentId: z.string().optional(),
});

export const createPatientSchema = registerPatientSchema;

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Paciente inválido'),
  examType: z.enum([ExamType.RAIO_X, ExamType.ULTRASSOM, ExamType.RESSONANCIA_MAGNETICA]),
  scheduledStart: z.string().datetime('Data e horário inválidos'),
  notes: z.string().max(500).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ]),
});

export const createReportSchema = z.object({
  appointmentId: z.string().uuid('Agendamento inválido'),
  title: z.string().min(2, 'Título é obrigatório').max(200),
  content: z.string().min(2, 'Texto do laudo é obrigatório'),
  responsibleName: z.string().min(2, 'Nome do responsável é obrigatório').max(150),
  status: z.enum([ReportStatus.DRAFT, ReportStatus.PUBLISHED]).default(ReportStatus.DRAFT),
});

export const updateReportSchema = z.object({
  title: z.string().min(2, 'Título é obrigatório').max(200).optional(),
  content: z.string().min(2, 'Texto do laudo é obrigatório').optional(),
  responsibleName: z.string().min(2, 'Nome do responsável é obrigatório').max(150).optional(),
  status: z.enum([ReportStatus.DRAFT, ReportStatus.PUBLISHED]).optional(),
});

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
}

export interface PatientSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  patientProfile: {
    dateOfBirth: string | null;
    documentId: string | null;
  } | null;
}

export interface AppointmentDTO {
  id: string;
  patientId: string;
  examType: ExamType;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    fullName: string;
    email: string;
  };
  medicalReport?: {
    id: string;
    status: ReportStatus;
    publishedAt: string | null;
  } | null;
}

export interface MedicalReportDTO {
  id: string;
  appointmentId: string;
  patientId: string;
  authoredById: string;
  title: string;
  content: string;
  responsibleName: string;
  status: ReportStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    fullName: string;
  };
  appointment?: {
    id: string;
    examType: ExamType;
    scheduledStart: string;
    status: AppointmentStatus;
  };
}

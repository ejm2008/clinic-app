import {
  AppointmentDTO,
  AppointmentStatus,
  AuthUser,
  ExamType,
  MedicalReportDTO,
  PatientSummary,
  ReportStatus,
} from '@clinic/shared';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as unknown as { __API_URL__?: string }).__API_URL__) {
    return (window as unknown as { __API_URL__: string }).__API_URL__;
  }
  return 'http://localhost:3001/api';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return localStorage.getItem('clinic_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('clinic_token', token);
  } else {
    localStorage.removeItem('clinic_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, data.message || 'Erro ao comunicar com o servidor');
  }

  return data as T;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    documentId?: string;
    dateOfBirth?: string;
  }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  listPatients: (search = '') =>
    request<{ patients: PatientSummary[] }>(
      `/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),

  createPatient: (body: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    documentId?: string;
    dateOfBirth?: string;
  }) =>
    request<{ patient: PatientSummary }>('/patients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listAppointments: (filters?: { date?: string; patientId?: string; examType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.patientId) params.set('patientId', filters.patientId);
    if (filters?.examType) params.set('examType', filters.examType);
    const qs = params.toString();
    return request<{ appointments: AppointmentDTO[] }>(`/appointments${qs ? `?${qs}` : ''}`);
  },

  createAppointment: (body: {
    patientId: string;
    examType: ExamType;
    scheduledStart: string;
    notes?: string;
  }) =>
    request<{ appointment: AppointmentDTO }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateAppointmentStatus: (id: string, status: AppointmentStatus) =>
    request<{ appointment: AppointmentDTO }>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listReports: () => request<{ reports: MedicalReportDTO[] }>('/reports'),

  getReport: (id: string) => request<{ report: MedicalReportDTO }>(`/reports/${id}`),

  createReport: (body: {
    appointmentId: string;
    title: string;
    content: string;
    responsibleName: string;
    status: ReportStatus;
  }) =>
    request<{ report: MedicalReportDTO }>('/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateReport: (
    id: string,
    body: {
      title?: string;
      content?: string;
      responsibleName?: string;
      status?: ReportStatus;
    },
  ) =>
    request<{ report: MedicalReportDTO }>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

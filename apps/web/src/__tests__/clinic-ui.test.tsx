import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppointmentStatus, ExamType, ReportStatus } from '@clinic/shared';
import { api } from '../lib/api';
import { PatientAppointmentsPage } from '../pages/patient/AppointmentsPage';
import { PatientReportDetailPage } from '../pages/patient/ReportDetailPage';
import { StaffSchedulePage } from '../pages/staff/SchedulePage';

jest.mock('../lib/api', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  api: {
    listAppointments: jest.fn(),
    listPatients: jest.fn(),
    getReport: jest.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Clinic Web — Componentes Principais', () => {
  it('exibe agendamentos do paciente sem botões de criar ou deletar', async () => {
    (api.listAppointments as jest.Mock).mockResolvedValue({
      appointments: [
        {
          id: 'appt-1',
          patientId: 'p-1',
          examType: ExamType.RAIO_X,
          status: AppointmentStatus.SCHEDULED,
          scheduledStart: '2026-12-01T12:00:00.000Z',
          scheduledEnd: '2026-12-01T12:30:00.000Z',
          checkedInAt: null,
          completedAt: null,
          cancelledAt: null,
          notes: null,
          createdAt: '2026-11-16T10:00:00.000Z',
          updatedAt: '2026-11-16T10:00:00.000Z',
          medicalReport: null,
        },
      ],
    });

    renderWithProviders(<PatientAppointmentsPage />);

    expect(await screen.findByText('Raio-X')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /criar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir|deletar/i })).not.toBeInTheDocument();
  });

  it('exibe título, texto, nome do responsável e data de publicação no laudo do paciente', async () => {
    (api.getReport as jest.Mock).mockResolvedValue({
      report: {
        id: 'rep-1',
        appointmentId: 'appt-1',
        patientId: 'p-1',
        authoredById: 'staff-1',
        title: 'Laudo de Ressonância Magnética',
        content: 'Estrutura anatômica preservada sem alterações agudas.',
        responsibleName: 'Dra. Ana Paula Souza',
        status: ReportStatus.PUBLISHED,
        publishedAt: '2026-11-16T14:00:00.000Z',
        createdAt: '2026-11-16T13:00:00.000Z',
        updatedAt: '2026-11-16T14:00:00.000Z',
      },
    });

    renderWithProviders(
      <Routes>
        <Route path="/patient/reports/:id" element={<PatientReportDetailPage />} />
      </Routes>,
      ['/patient/reports/rep-1'],
    );

    expect(await screen.findByText('Laudo de Ressonância Magnética')).toBeInTheDocument();
    expect(screen.getByText(/Estrutura anatômica preservada/i)).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana Paula Souza')).toBeInTheDocument();
    expect(screen.getByText(/Data de publicação:/i)).toBeInTheDocument();
  });

  it('renderiza filtros por data, paciente e tipo de exame na agenda da equipe', async () => {
    (api.listPatients as jest.Mock).mockResolvedValue({
      patients: [{ id: 'p-1', fullName: 'João Carlos Silva', email: 'joao@paciente.com' }],
    });
    (api.listAppointments as jest.Mock).mockResolvedValue({ appointments: [] });

    renderWithProviders(<StaffSchedulePage />);

    expect(await screen.findByLabelText('Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Paciente')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de exame', { selector: '#filter-exam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar Agendamento/i })).toBeInTheDocument();
  });
});

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, XCircle } from 'lucide-react';
import {
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
  EXAM_TYPE_LABELS,
  ExamType,
} from '@clinic/shared';
import { api, ApiError } from '../../lib/api';
import { APPOINTMENT_STATUS_BADGE, formatDateTime, formatTime } from '../../lib/format';

function getCurrentLocalDateTimeInput(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function StaffSchedulePage() {
  const queryClient = useQueryClient();

  const [filterDate, setFilterDate] = useState('');
  const [filterPatientId, setFilterPatientId] = useState('');
  const [filterExamType, setFilterExamType] = useState('');

  const [patientId, setPatientId] = useState('');
  const [examType, setExamType] = useState<ExamType>(ExamType.RAIO_X);
  const [scheduledStartLocal, setScheduledStartLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: patientsData } = useQuery({
    queryKey: ['staff-patients'],
    queryFn: () => api.listPatients(),
  });

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['staff-appointments', filterDate, filterPatientId, filterExamType],
    queryFn: () =>
      api.listAppointments({
        date: filterDate || undefined,
        patientId: filterPatientId || undefined,
        examType: filterExamType || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAppointment({
        patientId,
        examType,
        scheduledStart: new Date(scheduledStartLocal).toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      setFormError('');
      setScheduledStartLocal('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Erro ao criar agendamento');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id, status),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao atualizar status');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.updateAppointmentStatus(id, AppointmentStatus.CANCELLED),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Erro ao cancelar agendamento');
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!patientId || !scheduledStartLocal) {
      setFormError('Selecione um paciente e informe a data e horário');
      return;
    }
    createMutation.mutate();
  }

  const patients = patientsData?.patients ?? [];
  const appointments = appointmentsData?.appointments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agenda da Clínica</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cada exame possui duração fixa de 30 minutos. Agendamentos cancelados liberam o horário automaticamente.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Plus className="h-4 w-4 text-teal-700" />
          Novo Agendamento
        </h2>

        {formError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="new-patient" className="mb-1 block text-xs font-medium text-slate-700">
              Paciente cadastrado
            </label>
            <select
              id="new-patient"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-exam" className="mb-1 block text-xs font-medium text-slate-700">
              Tipo de exame
            </label>
            <select
              id="new-exam"
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            >
              {Object.values(ExamType).map((type) => (
                <option key={type} value={type}>
                  {EXAM_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-datetime" className="mb-1 block text-xs font-medium text-slate-700">
              Data e horário (30 min)
            </label>
            <input
              id="new-datetime"
              type="datetime-local"
              required
              min={getCurrentLocalDateTimeInput()}
              value={scheduledStartLocal}
              onChange={(e) => setScheduledStartLocal(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Agendando...' : 'Criar Agendamento'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">Consulta de Agendamentos</h2>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="filter-date" className="mb-1 block text-xs font-medium text-slate-600">
                Data
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="filter-patient" className="mb-1 block text-xs font-medium text-slate-600">
                Paciente
              </label>
              <select
                id="filter-patient"
                value={filterPatientId}
                onChange={(e) => setFilterPatientId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-exam" className="mb-1 block text-xs font-medium text-slate-600">
                Tipo de exame
              </label>
              <select
                id="filter-exam"
                value={filterExamType}
                onChange={(e) => setFilterExamType(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {Object.values(ExamType).map((type) => (
                  <option key={type} value={type}>
                    {EXAM_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {(filterDate || filterPatientId || filterExamType) && (
              <button
                type="button"
                onClick={() => {
                  setFilterDate('');
                  setFilterPatientId('');
                  setFilterExamType('');
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando agendamentos...</p>
        ) : appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhum agendamento encontrado para os filtros informados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Exame</th>
                  <th className="px-4 py-3">Horário</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Laudo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {appointments.map((appt) => {
                  const hasPublishedReport = appt.medicalReport?.status === 'PUBLISHED';
                  const isCancelled = appt.status === AppointmentStatus.CANCELLED;

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {appt.patient?.fullName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {EXAM_TYPE_LABELS[appt.examType]}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(appt.scheduledStart)} – {formatTime(appt.scheduledEnd)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            APPOINTMENT_STATUS_BADGE[appt.status]
                          }`}
                        >
                          {APPOINTMENT_STATUS_LABELS[appt.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {appt.medicalReport ? (
                          <Link
                            to={`/staff/reports/${appt.medicalReport.id}`}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            {appt.medicalReport.status === 'PUBLISHED' ? 'Ver Laudo' : 'Editar Rascunho'}
                          </Link>
                        ) : !isCancelled ? (
                          <Link
                            to={`/staff/reports/new/${appt.id}`}
                            className="font-medium text-indigo-700 hover:underline"
                          >
                            Criar Laudo
                          </Link>
                        ) : (
                          <span className="text-slate-400">Indisponível</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <select
                            aria-label={`Status de ${appt.patient?.fullName}`}
                            value={isCancelled ? '' : appt.status}
                            onChange={(e) =>
                              statusMutation.mutate({
                                id: appt.id,
                                status: e.target.value as AppointmentStatus,
                              })
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            {isCancelled && (
                              <option value="" disabled>
                                Alterar status...
                              </option>
                            )}
                            {Object.values(AppointmentStatus)
                              .filter((st) => st !== AppointmentStatus.CANCELLED)
                              .map((st) => (
                                <option key={st} value={st}>
                                  {APPOINTMENT_STATUS_LABELS[st]}
                                </option>
                              ))}
                          </select>

                          <button
                            type="button"
                            aria-label={`Cancelar agendamento de ${appt.patient?.fullName}`}
                            title={
                              hasPublishedReport
                                ? 'Agendamento com laudo publicado não pode ser cancelado'
                                : isCancelled
                                  ? 'Agendamento já cancelado'
                                  : 'Cancelar agendamento'
                            }
                            disabled={hasPublishedReport || isCancelled || cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(appt.id)}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

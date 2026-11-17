import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { APPOINTMENT_STATUS_LABELS, EXAM_TYPE_LABELS } from '@clinic/shared';
import { api } from '../../lib/api';
import { APPOINTMENT_STATUS_BADGE, formatDateTime, formatTime } from '../../lib/format';

export function PatientAppointmentsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => api.listAppointments(),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando seus agendamentos...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Não foi possível carregar os agendamentos.
      </div>
    );
  }

  const appointments = data?.appointments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meus Agendamentos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualização dos exames agendados em seu nome. Para alterações, entre em contato com a equipe da clínica.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhum agendamento encontrado em seu nome.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Exame</th>
                <th className="px-4 py-3">Data e Horário</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Laudo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
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
                    {appt.medicalReport?.status === 'PUBLISHED' ? (
                      <Link
                        to={`/patient/reports/${appt.medicalReport.id}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        Visualizar laudo
                      </Link>
                    ) : (
                      <span className="text-slate-400">Indisponível</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

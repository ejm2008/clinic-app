import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EXAM_TYPE_LABELS, REPORT_STATUS_LABELS } from '@clinic/shared';
import { api } from '../../lib/api';
import { formatDateTime, REPORT_STATUS_BADGE } from '../../lib/format';

export function StaffReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff-reports'],
    queryFn: () => api.listReports(),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando laudos...</p>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Não foi possível carregar os laudos.
      </div>
    );
  }

  const reports = data?.reports ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laudos Médicos</h1>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhum laudo cadastrado. Crie um laudo a partir da tela de Agenda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Exame</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Publicação</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{report.title}</td>
                  <td className="px-4 py-3 text-slate-700">{report.patient?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {report.appointment ? EXAM_TYPE_LABELS[report.appointment.examType] : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{report.responsibleName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        REPORT_STATUS_BADGE[report.status]
                      }`}
                    >
                      {REPORT_STATUS_LABELS[report.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {report.publishedAt ? formatDateTime(report.publishedAt) : 'Não publicado'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/staff/reports/${report.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {report.status === 'PUBLISHED' ? 'Visualizar' : 'Editar'}
                    </Link>
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

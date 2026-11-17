import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EXAM_TYPE_LABELS } from '@clinic/shared';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export function PatientReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-reports'],
    queryFn: () => api.listReports(),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando seus laudos...</p>;
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
        <h1 className="text-2xl font-bold text-slate-900">Meus Laudos Médicos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Laudos publicados pela equipe médica vinculados aos seus exames.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhum laudo publicado até o momento.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Link
              key={report.id}
              to={`/patient/reports/${report.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{report.title}</h2>
                {report.appointment && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {EXAM_TYPE_LABELS[report.appointment.examType]}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Responsável: <span className="font-medium text-slate-800">{report.responsibleName}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Publicado em: {formatDateTime(report.publishedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

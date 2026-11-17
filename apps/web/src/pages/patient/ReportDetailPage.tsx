import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export function PatientReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-report', id],
    queryFn: () => api.getReport(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando laudo...</p>;
  }

  if (isError || !data?.report) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Laudo não encontrado ou indisponível.
        </div>
        <Link to="/patient/reports" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar aos laudos
        </Link>
      </div>
    );
  }

  const { report } = data;

  return (
    <div className="space-y-6">
      <Link
        to="/patient/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Meus Laudos
      </Link>

      <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <p>
              Responsável: <span className="font-medium text-slate-900">{report.responsibleName}</span>
            </p>
            <p>
              Data de publicação:{' '}
              <span className="font-medium text-slate-900">{formatDateTime(report.publishedAt)}</span>
            </p>
          </div>
        </header>

        <div className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-slate-800">
          {report.content}
        </div>
      </article>
    </div>
  );
}

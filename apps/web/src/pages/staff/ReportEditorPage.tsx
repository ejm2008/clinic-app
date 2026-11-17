import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { ReportStatus } from '@clinic/shared';
import { api, ApiError } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export function StaffReportEditorPage() {
  const { id, appointmentId } = useParams<{ id?: string; appointmentId?: string }>();
  const isNew = Boolean(appointmentId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff-report', id],
    queryFn: () => api.getReport(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (data?.report) {
      setTitle(data.report.title);
      setContent(data.report.content);
      setResponsibleName(data.report.responsibleName);
    }
  }, [data]);

  const createMutation = useMutation({
    mutationFn: (status: ReportStatus) =>
      api.createReport({
        appointmentId: appointmentId!,
        title,
        content,
        responsibleName,
        status,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff-reports'] });
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      navigate(`/staff/reports/${res.report.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar laudo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (status: ReportStatus) =>
      api.updateReport(id!, {
        title,
        content,
        responsibleName,
        status,
      }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['staff-report', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-reports'] });
      queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar laudo');
    },
  });

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Carregando laudo...</p>;
  }

  const report = data?.report;
  const isPublished = report?.status === ReportStatus.PUBLISHED;
  const saving = createMutation.isPending || updateMutation.isPending;

  function handleSave(status: ReportStatus) {
    setError('');
    if (!title.trim() || !content.trim() || !responsibleName.trim()) {
      setError('Preencha título, texto e nome do responsável');
      return;
    }
    if (isNew) {
      createMutation.mutate(status);
    } else {
      updateMutation.mutate(status);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/staff/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para Laudos
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? 'Novo Laudo Médico' : isPublished ? 'Laudo Publicado' : 'Editar Rascunho de Laudo'}
            </h1>
            {report?.publishedAt && (
              <p className="mt-1 text-sm text-slate-600">
                Data de publicação:{' '}
                <span className="font-medium text-slate-900">{formatDateTime(report.publishedAt)}</span>
              </p>
            )}
          </div>

          {isPublished && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Lock className="h-3.5 w-3.5" /> Publicado (somente leitura)
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="report-title" className="mb-1 block text-sm font-medium text-slate-700">
              Título
            </label>
            <input
              id="report-title"
              disabled={isPublished}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Laudo de Ultrassonografia Abdominal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>

          <div>
            <label htmlFor="report-responsible" className="mb-1 block text-sm font-medium text-slate-700">
              Nome do responsável
            </label>
            <input
              id="report-responsible"
              disabled={isPublished}
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              placeholder="Ex.: Dra. Ana Paula Souza (CRM-SP 123456)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>

          <div>
            <label htmlFor="report-content" className="mb-1 block text-sm font-medium text-slate-700">
              Texto do laudo
            </label>
            <textarea
              id="report-content"
              rows={8}
              disabled={isPublished}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva os achados e conclusões do exame..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>

          {!isPublished && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(ReportStatus.DRAFT)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Salvar Rascunho
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(ReportStatus.PUBLISHED)}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                Publicar Laudo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

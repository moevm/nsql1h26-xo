import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LogRecord, getLog, updateLog } from '../api/client';

export function EditLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogRecord | null>(null);
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getLog(id)
      .then((data) => {
        setLog(data);
        setContent(data.content || '');
        setNote(data.note || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await updateLog(id, { content, note });
      toast.success('Лог сохранён');
      navigate(`/logs/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить лог');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  if (!log) return <div className="p-4 bg-white border border-gray-200 rounded-lg">Лог не найден</div>;

  return (
    <div>
      <Link to={`/logs/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к просмотру
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Редактирование лога {log.id}</h1>
      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Служебная заметка</span>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Текст лога</span>
              <textarea className="w-full min-h-[420px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} />
            </label>
            <div className="flex justify-end gap-3">
              <Link to={`/logs/${id}`}><Button type="button" variant="secondary">Отмена</Button></Link>
              <Button type="submit" loading={saving}><Save className="w-4 h-4" />Сохранить</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

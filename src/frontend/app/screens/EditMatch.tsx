import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MatchRecord, getMatch, updateMatch } from '../api/client';

export function EditMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getMatch(id)
      .then((data) => {
        setMatch(data);
        setComment(data.comment || '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (field: keyof MatchRecord, value: string) => {
    setMatch((current) => current ? { ...current, [field]: value } : current);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !match) return;
    setSaving(true);
    try {
      await updateMatch(id, {
        rules: match.rules,
        status: match.status,
        result: match.result,
        winnerBotId: match.winnerBotId || '',
        comment,
      });
      toast.success('Матч сохранён');
      navigate(`/matches/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить матч');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  if (!match) return <div className="p-4 bg-white border border-gray-200 rounded-lg">Матч не найден</div>;

  return (
    <div>
      <Link to={`/matches/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к карточке
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Редактирование матча {match.id}</h1>

      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Правила</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={match.rules} onChange={(e) => setField('rules', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Статус</span>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={match.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="Queued">Queued</option>
                  <option value="Running">Running</option>
                  <option value="Finished">Finished</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Результат</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={match.result} onChange={(e) => setField('result', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Победитель</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={match.winnerBotId || ''} onChange={(e) => setField('winnerBotId', e.target.value)} placeholder="B-001 или пусто" />
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Комментарий</span>
              <textarea className="w-full min-h-28 px-3 py-2 border border-gray-300 rounded-lg" value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            <div className="flex justify-end gap-3">
              <Link to={`/matches/${id}`}><Button type="button" variant="secondary">Отмена</Button></Link>
              <Button type="submit" loading={saving}><Save className="w-4 h-4" />Сохранить</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

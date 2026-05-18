import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BotRecord, getBot, updateBot } from '../api/client';

export function EditBot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotRecord | null>(null);
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getBot(id)
      .then((data) => {
        setBot(data);
        setTags((data.tags || []).join(', '));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (field: keyof BotRecord, value: string) => {
    setBot((current) => current ? { ...current, [field]: value } : current);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !bot) return;
    setSaving(true);
    try {
      await updateBot(id, {
        name: bot.name,
        language: bot.language,
        version: bot.version,
        status: bot.status,
        visibility: bot.visibility,
        description: bot.description || '',
        comment: bot.comment || '',
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      });
      toast.success('Бот сохранён');
      navigate(`/bots/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить бота');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  if (!bot) return <div className="p-4 bg-white border border-gray-200 rounded-lg">Бот не найден</div>;

  return (
    <div>
      <Link to={`/bots/${id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к карточке
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Редактирование бота</h1>

      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Название</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={bot.name} onChange={(e) => setField('name', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Язык</span>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value="Python" onChange={() => setField('language', 'Python')}><option>Python</option></select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Версия</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={bot.version} onChange={(e) => setField('version', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Статус</span>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={bot.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Видимость</span>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={bot.visibility} onChange={(e) => setField('visibility', e.target.value)}>
                  <option value="public">public</option>
                  <option value="private">private</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-2">Теги</span>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Описание</span>
              <textarea className="w-full min-h-28 px-3 py-2 border border-gray-300 rounded-lg" value={bot.description || ''} onChange={(e) => setField('description', e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Комментарий</span>
              <textarea className="w-full min-h-24 px-3 py-2 border border-gray-300 rounded-lg" value={bot.comment || ''} onChange={(e) => setField('comment', e.target.value)} />
            </label>
            <div className="flex justify-end gap-3">
              <Link to={`/bots/${id}`}><Button type="button" variant="secondary">Отмена</Button></Link>
              <Button type="submit" loading={saving}><Save className="w-4 h-4" />Сохранить</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

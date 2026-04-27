import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Upload, FileCode } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { uploadBot } from '../api/client';

export function UploadBot() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('Python');
  const [version, setVersion] = useState('1.0.0');
  const [tags, setTags] = useState('baseline');
  const [visibility, setVisibility] = useState('public');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Введите название бота');
      return;
    }
    if (!file) {
      setError('Добавьте файл бота');
      return;
    }

    const form = new FormData();
    form.set('name', name);
    form.set('language', language);
    form.set('version', version);
    form.set('tags', tags);
    form.set('visibility', visibility);
    form.set('description', description);
    form.set('comment', comment);
    form.set('file', file);

    setLoading(true);
    try {
      const bot = await uploadBot(form);
      navigate(`/bots/${bot.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки бота');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Загрузка бота</h1>
        <p className="text-gray-600 mt-1">Добавление новой версии решения в MongoDB</p>
      </div>

      <Card>
        <CardBody>
          {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block mb-2">Название</label>
                <input className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={(e) => setName(e.target.value)} placeholder="DiagonalHunter" />
              </div>
              <div>
                <label className="block mb-2">Язык</label>
                <select className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option>Python</option>
                  <option>JavaScript</option>
                  <option>Java</option>
                  <option>C++</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">Версия</label>
                <input className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
              </div>
              <div>
                <label className="block mb-2">Теги</label>
                <input className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="baseline, minimax" />
              </div>
              <div>
                <label className="block mb-2">Видимость</label>
                <select className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="public">public</option>
                  <option value="private">private</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">Файл бота</label>
                <label className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-dashed border-gray-300 flex items-center gap-2 cursor-pointer hover:bg-gray-100">
                  <FileCode className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700 truncate">{file ? file.name : 'Выберите .zip/.py/.tar.gz'}</span>
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>

            <div>
              <label className="block mb-2">Описание</label>
              <textarea className="w-full min-h-28 px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Кратко опишите стратегию бота" />
            </div>

            <div>
              <label className="block mb-2">Комментарий</label>
              <textarea className="w-full min-h-24 px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательный комментарий к версии" />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/bots')}>Отмена</Button>
              <Button type="submit" loading={loading}>
                <Upload className="w-4 h-4" />
                Загрузить
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

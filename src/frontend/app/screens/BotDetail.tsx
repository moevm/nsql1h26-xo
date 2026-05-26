import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Download, Play, Upload, ArrowLeft, Edit3 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BotRecord, MatchRecord, downloadBotSource, getBot, getMatches, getCurrentUser, updateBot } from '../api/client';
import { canManageBots } from '../auth/permissions';
import { toast } from 'sonner';

export function BotDetail() {
  const { id } = useParams();
  const [bot, setBot] = useState<BotRecord | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'matches' | 'run'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runSettings, setRunSettings] = useState({ maxMoves: '225', moveTimeoutMs: '1000' });
  const [savingRunSettings, setSavingRunSettings] = useState(false);
  const canManage = canManageBots(getCurrentUser());

  useEffect(() => {
    if (!id) return;
    Promise.all([getBot(id), getMatches({ bot: id, page: '1', page_size: '100' })])
      .then(([botData, matchData]) => {
        setBot(botData);
        setRunSettings({
          maxMoves: String(botData.runSettings?.maxMoves || 225),
          moveTimeoutMs: String(botData.runSettings?.moveTimeoutMs || 1000),
        });
        setMatches(matchData.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!bot) return;
    try {
      await downloadBotSource(bot.id, bot.fileName || `${bot.id}.py`);
      toast.success('Файл бота скачан');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось скачать файл бота');
    }
  };


  const handleRunSettingsSave = async () => {
    if (!bot) return;

    const maxMoves = Number(runSettings.maxMoves);
    const moveTimeoutMs = Number(runSettings.moveTimeoutMs);

    if (!Number.isFinite(maxMoves) || maxMoves < 1) {
      toast.error('Лимит ходов должен быть положительным числом');
      return;
    }
    if (!Number.isFinite(moveTimeoutMs) || moveTimeoutMs < 100) {
      toast.error('Таймаут хода должен быть не меньше 100 мс');
      return;
    }

    setSavingRunSettings(true);
    try {
      const updated = await updateBot(bot.id, { runSettings: { maxMoves, moveTimeoutMs } });
      setBot(updated);
      setRunSettings({
        maxMoves: String(updated.runSettings?.maxMoves || maxMoves),
        moveTimeoutMs: String(updated.runSettings?.moveTimeoutMs || moveTimeoutMs),
      });
      toast.success('Настройки запуска сохранены');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить настройки запуска');
    } finally {
      setSavingRunSettings(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  if (!bot) return <div className="p-4 bg-white border border-gray-200 rounded-lg">Бот не найден</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link to="/bots" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{bot.name}</h1>
            <Badge variant={bot.status === 'active' ? 'success' : 'default'}>{bot.status}</Badge>
          </div>
          <p className="text-gray-600 mt-1">{bot.id} • версия {bot.version} • {bot.language}</p>
        </div>
        <div className="flex gap-3">
          {canManage && (
            <Link to={`/bots/${bot.id}/edit`}>
              <Button variant="secondary">
                <Edit3 className="w-4 h-4" />
                Редактировать
              </Button>
            </Link>
          )}
          <Button variant="secondary" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            Скачать файл
          </Button>
          {canManage && (
            <Link to="/bots/upload">
              <Button variant="secondary">
                <Upload className="w-4 h-4" />
                Заменить версию
              </Button>
            </Link>
          )}
          <Link to={`/matches?bot=${bot.id}`}>
            <Button>
              <Play className="w-4 h-4" />
              Запустить матч
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
              <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">{bot.id}</code>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Название</label>
              <p className="text-gray-900">{bot.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Язык</label>
              <p className="text-gray-900">{bot.language}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Версия</label>
              <p className="text-gray-900">{bot.version}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Владелец</label>
              <p className="text-gray-900">{bot.uploadedBy}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Создан</label>
              <p className="text-gray-900">{bot.created}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Обновлён</label>
              <p className="text-gray-900">{bot.updated}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Hash</label>
              <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">{bot.hash}</code>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Описание' },
              { id: 'files', label: 'Файлы' },
              { id: 'matches', label: 'Матчи' },
              { id: 'run', label: 'Настройки запуска' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <CardBody>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-gray-700">{bot.description || 'Описание стратегии не заполнено.'}</p>
              <div className="flex flex-wrap gap-2">
                {bot.tags.map((tag) => <Badge key={tag} variant="default">{tag}</Badge>)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">ELO</p><p className="text-2xl font-bold">{bot.elo || 0}</p></div>
                <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Матчи</p><p className="text-2xl font-bold">{bot.matchesCount || 0}</p></div>
                <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Победы</p><p className="text-2xl font-bold">{bot.wins || 0}</p></div>
                <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Поражения</p><p className="text-2xl font-bold">{bot.losses || 0}</p></div>
              </div>
            </div>
          )}
          {activeTab === 'files' && (
            <div className="p-4 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{bot.fileName || 'source.py'}</p>
                <p className="text-sm text-gray-500">{bot.sizeBytes || 1024} байт • {bot.hash}</p>
              </div>
              <Button variant="secondary" onClick={handleDownload}><Download className="w-4 h-4" />Скачать файл</Button>
            </div>
          )}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              {matches.length === 0 && <p className="text-gray-500">Матчи для этого бота пока не найдены.</p>}
              {matches.map((match) => (
                <Link key={match.id} to={`/matches/${match.id}`} className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{match.botAName} vs {match.botBName}</p>
                      <p className="text-sm text-gray-500">{match.id} • {match.started}</p>
                    </div>
                    <Badge variant={match.status === 'Finished' ? 'success' : match.status === 'Failed' ? 'error' : 'info'}>{match.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {activeTab === 'run' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Лимит ходов</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-500"
                    value={runSettings.maxMoves}
                    min="1"
                    max="1000"
                    disabled={!canManage}
                    onChange={(event) => setRunSettings((value) => ({ ...value, maxMoves: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="block mb-2">Таймаут хода, мс</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-500"
                    value={runSettings.moveTimeoutMs}
                    min="100"
                    max="30000"
                    disabled={!canManage}
                    onChange={(event) => setRunSettings((value) => ({ ...value, moveTimeoutMs: event.target.value }))}
                  />
                </div>
              </div>
              {canManage ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={handleRunSettingsSave} loading={savingRunSettings}>Сохранить настройки запуска</Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Изменение настроек доступно модератору или администратору.</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

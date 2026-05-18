import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, Search, Edit3 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { LogRecord, downloadLogSource, getCurrentUser, getLog } from '../api/client';
import { canViewLogs } from '../auth/permissions';

export function LogViewer() {
  const { id } = useParams();
  const [log, setLog] = useState<LogRecord | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canEdit = canViewLogs(getCurrentUser());

  useEffect(() => {
    if (!id) return;
    getLog(id)
      .then(setLog)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const lines = useMemo(() => {
    const allLines = (log?.content || '').split('\n').filter(Boolean);
    if (!query.trim()) return allLines;
    return allLines.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
  }, [log, query]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  if (!log) return <div className="p-4 bg-white border border-gray-200 rounded-lg">Лог не найден</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link to="/logs" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3">
            <ArrowLeft className="w-4 h-4" />
            Назад к логам
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{log.id}</h1>
            <Badge variant={log.level === 'ERROR' ? 'error' : log.level === 'WARN' ? 'warning' : 'info'}>{log.level}</Badge>
          </div>
          <p className="text-gray-600 mt-1">{log.type} • матч {log.relatedMatch} • {log.size}</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <Link to={`/logs/${log.id}/edit`}>
              <Button variant="secondary"><Edit3 className="w-4 h-4" />Редактировать</Button>
            </Link>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await downloadLogSource(log.id, `${log.id}.log`);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Не удалось скачать лог');
              }
            }}
          >
            <Download className="w-4 h-4" />Скачать
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Поиск по тексту лога"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="font-mono text-sm max-h-[650px] overflow-y-auto bg-gray-950 text-gray-100 rounded-lg p-4">
            {lines.length === 0 && <div className="text-gray-400">Фрагменты не найдены</div>}
            {lines.map((line, index) => {
              const className = line.includes('ERROR')
                ? 'text-red-300'
                : line.includes('WARN')
                  ? 'text-yellow-300'
                  : line.includes('DEBUG')
                    ? 'text-gray-400'
                    : 'text-gray-100';
              return <div key={`${line}-${index}`} className={className}>{line}</div>;
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

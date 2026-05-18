import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Download, Eye, Search, X } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Table, Column } from '../components/Table';
import { LogRecord, downloadLogSource, getLogs } from '../api/client';

const emptyFilters = { id: '', type: '', level: '', match_id: '', query: '', date_from: '', date_to: '' };

export function Logs() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(emptyFilters);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = () => {
    setLoading(true);
    setError('');
    getLogs(filters)
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setFilters(emptyFilters);
    setLoading(true);
    getLogs({})
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  const getLevelVariant = (level: string) => {
    if (level === 'ERROR') return 'error';
    if (level === 'WARN') return 'warning';
    if (level === 'INFO') return 'info';
    return 'default';
  };

  const columns: Column<LogRecord>[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'type', label: 'Тип', sortable: true, render: (log) => <Badge variant="default">{log.type}</Badge> },
    { key: 'relatedMatch', label: 'Матч', sortable: true },
    { key: 'level', label: 'Уровень', sortable: true, render: (log) => <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge> },
    { key: 'startTime', label: 'Начало', sortable: true },
    { key: 'endTime', label: 'Конец', sortable: true },
    { key: 'size', label: 'Размер', sortable: true },
    {
      key: 'actions',
      label: 'Действия',
      render: (log) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link to={`/logs/${log.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Открыть лог">
            <Eye className="w-4 h-4" />
          </Link>
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            title="Скачать лог"
            onClick={async () => {
              try {
                await downloadLogSource(log.id, `${log.id}.log`);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Не удалось скачать лог');
              }
            }}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Логи</h1>
          <p className="text-gray-600 mt-1">Просмотр логов матчей, ботов и системы</p>
        </div>
        <Button variant="secondary">
          <Download className="w-4 h-4" />
          Экспорт логов
        </Button>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Фильтры логов</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ID лога" value={filters.id} onChange={(e) => setFilters({ ...filters, id: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Тип" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Уровень" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ID матча" value={filters.match_id} onChange={(e) => setFilters({ ...filters, match_id: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Текст в сообщении" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={loadLogs} className="flex-1">Применить</Button>
              <Button variant="secondary" onClick={clearFilters}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {loading ? <LoadingSpinner /> : <Table columns={columns} data={logs} emptyMessage="По заданным фильтрам логов нет" onRowClick={(row) => navigate(`/logs/${row.id}`)} />}
    </div>
  );
}

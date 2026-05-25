import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, X, Eye } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Table, Column } from '../components/Table';
import { MatchRecord, getMatches } from '../api/client';

const emptyFilters = { id: '', bot: '', status: '', result: '', rules: '' };

function filtersFromParams(params: URLSearchParams) {
  return {
    ...emptyFilters,
    id: params.get('id') || '',
    bot: params.get('bot') || '',
    status: params.get('status') || '',
    result: params.get('result') || '',
    rules: params.get('rules') || '',
  };
}

function filtersToParams(filters: typeof emptyFilters, page = 1, pageSize = 10) {
  const nextParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) nextParams.set(key, value.trim());
  });
  if (page > 1) nextParams.set('page', String(page));
  if (pageSize !== 10) nextParams.set('page_size', String(pageSize));
  return nextParams;
}

export function Matches() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromParams(params));
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [page, setPage] = useState(Number(params.get('page') || 1));
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMatches = (nextPage = 1) => {
    setPage(nextPage);
    setParams(filtersToParams(filters, nextPage, pageSize));
    setLoading(true);
    setError('');
    getMatches({ ...filters, page: String(nextPage), page_size: String(pageSize) })
      .then((payload) => {
        setMatches(payload.items);
        setPage(payload.page);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatches(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setFilters(emptyFilters);
    setParams({});
    setLoading(true);
    setPage(1);
    getMatches({ page: '1', page_size: String(pageSize) })
      .then((payload) => {
        setMatches(payload.items);
        setPage(payload.page);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  const columns: Column<MatchRecord>[] = [
    { key: 'id', label: 'ID', sortable: true },
    {
      key: 'bots',
      label: 'Боты',
      render: (match) => <div className="font-medium text-gray-900">{match.botAName} vs {match.botBName}</div>,
    },
    { key: 'rules', label: 'Правила', sortable: true },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (match) => <Badge variant={match.status === 'Finished' ? 'success' : match.status === 'Failed' ? 'error' : 'info'}>{match.status}</Badge>,
    },
    { key: 'result', label: 'Результат', sortable: true },
    { key: 'started', label: 'Время', sortable: true },
    { key: 'movesCount', label: 'Ходы', sortable: true },
    {
      key: 'actions',
      label: 'Действия',
      render: (match) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${match.id}`); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Матчи</h1>
          <p className="text-gray-600 mt-1">Карточки запусков, результаты и история статусов</p>
        </div>
        <Link to="/matches/create">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Создать матч
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Фильтры матчей</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ID матча" value={filters.id} onChange={(e) => setFilters({ ...filters, id: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ID/название бота" value={filters.bot} onChange={(e) => setFilters({ ...filters, bot: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Статус" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Результат" value={filters.result} onChange={(e) => setFilters({ ...filters, result: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Правила" value={filters.rules} onChange={(e) => setFilters({ ...filters, rules: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => loadMatches(1)} className="flex-1">Применить</Button>
              <Button variant="secondary" onClick={clearFilters}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {loading ? <LoadingSpinner /> : (
        <Table
          columns={columns}
          data={matches}
          emptyMessage="Матчи по заданным фильтрам не найдены"
          onRowClick={(row) => navigate(`/matches/${row.id}`)}
          pagination={{ page, pageSize, total, totalPages, onPageChange: loadMatches }}
        />
      )}
    </div>
  );
}

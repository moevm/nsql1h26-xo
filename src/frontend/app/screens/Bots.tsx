import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, X, Eye, Play, Download } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardBody } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Table, Column } from '../components/Table';
import { BotRecord, downloadBotSource, getBots, getCurrentUser } from '../api/client';
import { canManageBots } from '../auth/permissions';
import { toast } from 'sonner';

const emptyFilters = {
  id: '',
  name: '',
  language: '',
  version: '',
  status: '',
  tag: '',
  owner_login: '',
};

function filtersFromParams(params: URLSearchParams) {
  return {
    ...emptyFilters,
    id: params.get('id') || '',
    name: params.get('name') || '',
    language: params.get('language') || '',
    version: params.get('version') || '',
    status: params.get('status') || '',
    tag: params.get('tag') || '',
    owner_login: params.get('owner_login') || '',
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

export function Bots() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [filters, setFilters] = useState(() => filtersFromParams(params));
  const [page, setPage] = useState(Number(params.get('page') || 1));
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canUpload = canManageBots(getCurrentUser());

  const loadBots = (nextPage = 1) => {
    setPage(nextPage);
    setParams(filtersToParams(filters, nextPage, pageSize));
    setLoading(true);
    setError('');
    getBots({ ...filters, page: String(nextPage), page_size: String(pageSize) })
      .then((payload) => {
        setBots(payload.items);
        setPage(payload.page);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBots(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setFilters(emptyFilters);
    setParams({});
    setLoading(true);
    setPage(1);
    getBots({ page: '1', page_size: String(pageSize) })
      .then((payload) => {
        setBots(payload.items);
        setPage(payload.page);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  const columns: Column<BotRecord>[] = [
    { key: 'id', label: 'ID', sortable: true },
    {
      key: 'name',
      label: 'Название',
      sortable: true,
      render: (bot) => (
        <div>
          <div className="font-medium text-gray-900">{bot.name}</div>
          <div className="text-xs text-gray-500">{bot.hash}</div>
        </div>
      ),
    },
    { key: 'language', label: 'Язык', sortable: true },
    { key: 'version', label: 'Версия', sortable: true },
    {
      key: 'tags',
      label: 'Теги',
      render: (bot) => (
        <div className="flex flex-wrap gap-1">
          {bot.tags.map((tag) => <Badge key={tag} variant="default">{tag}</Badge>)}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (bot) => <Badge variant={bot.status === 'active' ? 'success' : 'default'}>{bot.status}</Badge>,
    },
    { key: 'uploadedBy', label: 'Автор', sortable: true },
    { key: 'updated', label: 'Обновлён', sortable: true },
    {
      key: 'actions',
      label: 'Действия',
      render: (bot) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link to={`/bots/${bot.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Открыть карточку">
            <Eye className="w-4 h-4" />
          </Link>
          <Link to={`/matches?bot=${bot.id}`} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Матчи">
            <Play className="w-4 h-4" />
          </Link>
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            title="Скачать файл бота"
            onClick={async () => {
              try {
                await downloadBotSource(bot.id, bot.fileName || `${bot.id}.py`);
                toast.success('Файл бота скачан');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Не удалось скачать файл бота');
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
          <h1 className="text-3xl font-bold text-gray-900">Боты</h1>
          <p className="text-gray-600 mt-1">Просмотр, фильтрация и загрузка пользовательских ботов</p>
        </div>
        {canUpload && (
          <Link to="/bots/upload">
            <Button variant="primary">
              <Plus className="w-4 h-4" />
              Загрузить бота
            </Button>
          </Link>
        )}
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Многокритериальный поиск</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ID" value={filters.id} onChange={(e) => setFilters({ ...filters, id: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Название" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Язык" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Версия" value={filters.version} onChange={(e) => setFilters({ ...filters, version: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Статус" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Тег" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} />
            <input className="px-4 py-2.5 bg-input-background rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Владелец" value={filters.owner_login} onChange={(e) => setFilters({ ...filters, owner_login: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => loadBots(1)} className="flex-1">Применить</Button>
              <Button variant="secondary" onClick={clearFilters}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">Поиск по текстовым полям выполняется без учёта регистра и по подстроке.</p>
        </CardBody>
      </Card>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {loading ? <LoadingSpinner /> : (
        <Table
          columns={columns}
          data={bots}
          emptyMessage="Боты по заданным фильтрам не найдены"
          onRowClick={(row) => navigate(`/bots/${row.id}`)}
          pagination={{ page, pageSize, total, totalPages, onPageChange: loadBots }}
        />
      )}
    </div>
  );
}

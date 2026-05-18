import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Card, CardBody } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Search, Filter, Eye, Play, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser, globalSearch } from '../api/client';
import { canViewLogs } from '../auth/permissions';

interface SearchResult {
  bots: any[];
  matches: any[];
  logs: any[];
}

const emptyResults: SearchResult = { bots: [], matches: [], logs: [] };

export function GlobalSearch() {
  const [params] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  const [activeTab, setActiveTab] = useState<'bots' | 'matches' | 'logs'>('bots');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({ status: '', dateFrom: '', dateTo: '', language: '', level: '' });
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResult>(emptyResults);
  const [loading, setLoading] = useState(false);
  const canSearchLogs = canViewLogs(getCurrentUser());

  const mapSearchPayload = (data: any): SearchResult => ({
    bots: data.bots || [],
    matches: (data.matches || []).map((match: any) => ({
      id: match.id,
      botA: match.botAName,
      botB: match.botBName,
      status: match.status,
      result: match.result,
      date: match.started,
    })),
    logs: (data.logs || []).map((log: any) => ({
      id: log.id,
      type: log.type,
      relatedMatch: log.relatedMatch,
      level: log.level,
      timestamp: log.startTime,
      size: log.size,
    })),
  });

  const runSearch = async (value: string) => {
    setLoading(true);
    try {
      const data = await globalSearch(value);
      setResults(mapSearchPayload(data));
      setHasSearched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Поиск не выполнен');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
      runSearch(q);
    }
  }, [params]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Введите поисковый запрос');
      return;
    }
    await runSearch(searchQuery.trim());
    toast.success('Поиск выполнен');
  };

  const handleClearFilters = () => {
    setFilters({ status: '', dateFrom: '', dateTo: '', language: '', level: '' });
  };

  const filteredResults = {
    bots: results.bots.filter((bot) => {
      if (filters.status && bot.status !== filters.status) return false;
      if (filters.language && bot.language !== filters.language) return false;
      return true;
    }),
    matches: results.matches.filter((match) => {
      if (filters.status && match.status !== filters.status) return false;
      if (filters.dateFrom && String(match.date).slice(0, 10) < filters.dateFrom) return false;
      if (filters.dateTo && String(match.date).slice(0, 10) > filters.dateTo) return false;
      return true;
    }),
    logs: results.logs.filter((log) => {
      if (filters.level && log.level !== filters.level) return false;
      if (filters.dateFrom && String(log.timestamp).slice(0, 10) < filters.dateFrom) return false;
      if (filters.dateTo && String(log.timestamp).slice(0, 10) > filters.dateTo) return false;
      return true;
    }),
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const resultCount = {
    bots: filteredResults.bots.length,
    matches: filteredResults.matches.length,
    logs: filteredResults.logs.length,
  };
  const visibleTabs: Array<'bots' | 'matches' | 'logs'> = canSearchLogs ? ['bots', 'matches', 'logs'] : ['bots', 'matches'];

  useEffect(() => {
    if (!canSearchLogs && activeTab === 'logs') {
      setActiveTab('bots');
    }
  }, [activeTab, canSearchLogs]);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Глобальный поиск' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Глобальный поиск</h1>
        <p className="text-gray-600 mt-1">Поиск по ботам, матчам и логам</p>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по ботам, матчам, логам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
              <Button onClick={handleSearch} loading={loading}>
                <Search className="w-4 h-4" />
                Найти
              </Button>
              <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-blue-50 border-blue-300' : ''}>
                <Filter className="w-4 h-4" />
                Фильтры
                {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">{Object.values(filters).filter(v => v !== '').length}</span>}
              </Button>
            </div>

            {showFilters && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                    <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Все</option>
                      <option value="active">active</option>
                      <option value="archived">archived</option>
                      <option value="Finished">Finished</option>
                      <option value="Failed">Failed</option>
                      <option value="Running">Running</option>
                      <option value="Queued">Queued</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Язык</label>
                    <select value={filters.language} onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Все</option>
                      <option value="Python">Python</option>
                      <option value="Python">Python</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Уровень логов</label>
                    <select value={filters.level} onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Все</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Дата от</label>
                    <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Дата до</label>
                    <input type="date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                {hasActiveFilters && <div className="mt-4 flex justify-end"><Button variant="ghost" onClick={handleClearFilters}><X className="w-4 h-4" />Очистить фильтры</Button></div>}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {hasSearched && (
        <Card>
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {visibleTabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  {tab === 'bots' ? 'Боты' : tab === 'matches' ? 'Матчи' : 'Логи'}
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">{resultCount[tab]}</span>
                </button>
              ))}
            </nav>
          </div>

          <CardBody className="p-0">
            {activeTab === 'bots' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Язык</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Версия</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredResults.bots.map(bot => (
                      <tr key={bot.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-blue-600">{bot.id}</td><td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{bot.name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bot.language}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bot.version}</td><td className="px-6 py-4 whitespace-nowrap"><Badge variant={bot.status === 'active' ? 'success' : 'default'}>{bot.status}</Badge></td><td className="px-6 py-4 whitespace-nowrap"><Link to={`/bots/${bot.id}`}><button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Eye className="w-4 h-4" /></button></Link></td></tr>
                    ))}
                    {filteredResults.bots.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Боты не найдены</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Бот A</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Бот B</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Результат</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredResults.matches.map(match => (
                      <tr key={match.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-blue-600">{match.id}</td><td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{match.botA}</td><td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{match.botB}</td><td className="px-6 py-4 whitespace-nowrap"><Badge variant={match.status === 'Failed' ? 'error' : match.status === 'Finished' ? 'success' : 'warning'}>{match.status}</Badge></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.result}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{match.date}</td><td className="px-6 py-4 whitespace-nowrap"><div className="flex gap-2"><Link to={`/matches/${match.id}`}><button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Eye className="w-4 h-4" /></button></Link><button className="p-1.5 hover:bg-green-50 rounded-lg text-green-600"><Play className="w-4 h-4" /></button></div></td></tr>
                    ))}
                    {filteredResults.matches.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Матчи не найдены</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Log ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Связанный матч</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Уровень</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Размер</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredResults.logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-blue-600">{log.id}</td><td className="px-6 py-4 whitespace-nowrap"><Badge variant="info">{log.type}</Badge></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"><Link to={`/matches/${log.relatedMatch}`} className="text-blue-600 hover:underline">{log.relatedMatch}</Link></td><td className="px-6 py-4 whitespace-nowrap"><Badge variant={log.level === 'ERROR' ? 'error' : log.level === 'WARN' || log.level === 'WARNING' ? 'warning' : 'info'}>{log.level}</Badge></td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.timestamp}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.size}</td><td className="px-6 py-4 whitespace-nowrap"><Link to={`/logs/${log.id}`}><button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><FileText className="w-4 h-4" /></button></Link></td></tr>
                    ))}
                    {filteredResults.logs.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Логи не найдены</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {!hasSearched && (
        <Card>
          <CardBody>
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4"><Search className="w-10 h-10 text-gray-400" /></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Начните поиск</h3>
              <p className="text-gray-600 max-w-md mx-auto">Введите запрос в поле выше. Результаты появятся здесь.</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

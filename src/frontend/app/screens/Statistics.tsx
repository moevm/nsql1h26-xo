import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Plus, TrendingUp, TrendingDown, Activity, Trophy, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentUser, getStatistics, StatisticsSummary } from '../api/client';
import { canUseAnalysisTools } from '../auth/permissions';

interface BotRanking {
  rank: number;
  id: string;
  name: string;
  winrate: number;
  games: number;
  avgDuration: string;
  trend: 'up' | 'down' | 'stable';
}

const rulesets = ['Все правила', 'Поле 19×19; победа: 5 в ряд', 'Поле 15×15; победа: 5 в ряд'];

export function Statistics() {
  const [params, setParams] = useSearchParams();
  const [dateRange, setDateRange] = useState({
    from: params.get('date_from') || '',
    to: params.get('date_to') || '',
  });
  const [selectedRuleset, setSelectedRuleset] = useState(params.get('rules') || 'Все правила');
  const [selectedBots, setSelectedBots] = useState<string[]>(params.get('bot') ? [params.get('bot') as string] : []);
  const [rankings, setRankings] = useState<BotRanking[]>([]);
  const [summary, setSummary] = useState<StatisticsSummary>({
    averageWinrate: 0,
    averageMoves: 0,
    averageDuration: '0:00',
    errorRate: 0,
    totalMatches: 0,
    finishedMatches: 0,
    failedMatches: 0,
    errorLogs: 0,
  });
  const [loading, setLoading] = useState(false);
  const canBuildReports = canUseAnalysisTools(getCurrentUser());

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (dateRange.from) nextParams.set('date_from', dateRange.from);
    if (dateRange.to) nextParams.set('date_to', dateRange.to);
    if (selectedRuleset !== 'Все правила') nextParams.set('rules', selectedRuleset);
    if (selectedBots[0]) nextParams.set('bot', selectedBots[0]);
    setParams(nextParams);

    setLoading(true);
    getStatistics({
      date_from: dateRange.from,
      date_to: dateRange.to,
      rules: selectedRuleset === 'Все правила' ? '' : selectedRuleset,
      bot: selectedBots[0],
    })
      .then((data) => {
        setSummary(data.summary);
        setRankings(data.rankings.map((item) => ({
          rank: item.rank,
          id: item.id,
          name: item.name,
          winrate: item.winrate,
          games: item.games,
          avgDuration: item.avgDuration,
          trend: item.trend,
        })));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить статистику'))
      .finally(() => setLoading(false));
  }, [dateRange.from, dateRange.to, selectedRuleset, selectedBots]);

  const botOptions = useMemo(() => rankings.map((bot) => ({ id: bot.id, name: bot.name })), [rankings]);
  const winrateChartData = useMemo(() => rankings.slice(0, 8).map((bot) => ({
    name: bot.name,
    winrate: bot.winrate,
  })), [rankings]);
  const outcomeChartData = useMemo(() => [
    { name: 'Завершены', value: summary.finishedMatches },
    { name: 'Ошибки', value: summary.failedMatches },
    { name: 'Ошибочные логи', value: summary.errorLogs },
  ], [summary.finishedMatches, summary.failedMatches, summary.errorLogs]);


  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
          <p className="text-gray-600 mt-1">Аналитика и отчёты по матчам</p>
        </div>
        <div className="flex gap-3">
          {canBuildReports && (
            <Link to="/statistics/custom">
              <Button>
                <Plus className="w-4 h-4" />
                Создать кастомный отчёт
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Диапазон дат</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span className="flex items-center text-gray-500">—</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Правила игры</label>
              <select
                value={selectedRuleset}
                onChange={(e) => setSelectedRuleset(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {rulesets.map(ruleset => (
                  <option key={ruleset} value={ruleset}>{ruleset}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Выбрать ботов</label>
              <select
                multiple
                value={selectedBots}
                onChange={(e) => setSelectedBots(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={3}
              >
                {botOptions.map(bot => (
                  <option key={bot.id} value={bot.id}>{bot.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Общие показатели</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-blue-200 rounded-lg"><Trophy className="w-6 h-6 text-blue-700" /></div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 mb-1">Средний винрейт</p>
              <p className="text-3xl font-bold text-blue-900">{summary.averageWinrate}%</p>
              <p className="text-xs text-blue-600 mt-1">По данным bot_stats</p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-green-200 rounded-lg"><Activity className="w-6 h-6 text-green-700" /></div>
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 mb-1">Среднее ходов</p>
              <p className="text-3xl font-bold text-green-900">{summary.averageMoves}</p>
              <p className="text-xs text-green-600 mt-1">По коллекции matches</p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-purple-200 rounded-lg"><Clock className="w-6 h-6 text-purple-700" /></div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 mb-1">Средняя длительность</p>
              <p className="text-3xl font-bold text-purple-900">{summary.averageDuration}</p>
              <p className="text-xs text-purple-600 mt-1">По завершённым матчам</p>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-red-200 rounded-lg"><Target className="w-6 h-6 text-red-700" /></div>
                <TrendingDown className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-red-700 mb-1">Процент ошибок</p>
              <p className="text-3xl font-bold text-red-900">{summary.errorRate}%</p>
              <p className="text-xs text-green-600 mt-1">Ошибочные матчи и логи</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Рейтинг ботов</h2>
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Место</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бот</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Винрейт</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Игр</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Средняя длительность</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тренд</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rankings.map((bot) => (
                    <tr key={bot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{bot.rank}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/bots/${bot.id}`} className="font-semibold text-blue-600 hover:underline">{bot.name}</Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{bot.winrate}%</div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${bot.winrate}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bot.games}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bot.avgDuration}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bot.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
                        {bot.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
                        {bot.trend === 'stable' && <Activity className="w-5 h-5 text-gray-400" />}
                      </td>
                    </tr>
                  ))}
                  {!loading && rankings.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Данных для рейтинга нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h3 className="text-lg font-semibold text-gray-900">Винрейт по ботам</h3></CardHeader>
          <CardBody>
            {winrateChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={winrateChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Винрейт']} />
                    <Bar dataKey="winrate" name="Винрейт" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                Нет данных для построения графика
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="text-lg font-semibold text-gray-900">Распределение исходов</h3></CardHeader>
          <CardBody>
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, 'Количество']} />
                  <Bar dataKey="value" name="Количество" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span>Завершены</span><Badge variant="success">{summary.finishedMatches}</Badge></div>
              <div className="flex items-center justify-between"><span>Ошибки</span><Badge variant="error">{summary.failedMatches}</Badge></div>
              <div className="flex items-center justify-between"><span>Ошибочные логи</span><Badge variant="warning">{summary.errorLogs}</Badge></div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

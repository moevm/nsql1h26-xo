import { useEffect, useState } from 'react';
import { Bot, FileText, Swords, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '../components/Card';
import { Badge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MatchRecord, OverviewSummary, getOverview } from '../api/client';
import { Link } from 'react-router';

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Bot }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function Overview() {
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getOverview()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>;
  }

  const data = summary || { bots: 0, matches: 0, logs: 0, activeBots: 0, failedMatches: 0, recentMatches: [] as MatchRecord[] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Обзор</h1>
        <p className="text-gray-600 mt-1">Платформа запуска ботов для бесконечных крестиков-ноликов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <StatCard title="Боты" value={data.bots} icon={Bot} />
        <StatCard title="Активные боты" value={data.activeBots} icon={Bot} />
        <StatCard title="Матчи" value={data.matches} icon={Swords} />
        <StatCard title="Логи" value={data.logs} icon={FileText} />
      </div>

      {data.failedMatches > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-yellow-800">
          <AlertCircle className="w-5 h-5" />
          <span>Есть матчи со статусом Failed: {data.failedMatches}</span>
        </div>
      )}

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Последние матчи</h2>
            <Link to="/matches" className="text-blue-600 hover:text-blue-700">Открыть все</Link>
          </div>
          <div className="space-y-3">
            {data.recentMatches.map((match) => (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{match.botAName} vs {match.botBName}</p>
                    <p className="text-sm text-gray-500">{match.id} • {match.started}</p>
                  </div>
                  <Badge variant={match.status === 'Finished' ? 'success' : match.status === 'Failed' ? 'error' : 'info'}>
                    {match.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

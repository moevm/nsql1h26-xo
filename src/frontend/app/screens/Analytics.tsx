import { useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { AlertTriangle, Play, Info, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { runClustering } from '../api/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const featureSets = [
  { id: 'logs', name: 'По логам', description: 'Ошибки и технические сообщения матчей' },
  { id: 'moves', name: 'По ходам', description: 'Количество ходов и длительность решений' },
  { id: 'combined', name: 'Комбинированные', description: 'Рейтинг, винрейт, статистика матчей и ошибки' },
];

const algorithms = [
  { id: 'kmeans', name: 'K-Means', params: ['Количество кластеров (k)'] },
];

const chartColors = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#06b6d4'];

interface Cluster {
  id: number;
  name: string;
  bots: string[];
  characteristics: string;
  color: string;
}

interface ClusterPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  elo: number;
  winrate: number;
  avgMoves: number;
  avgDurationSeconds: number;
  errors: number;
  clusterId: number;
  clusterName: string;
}

interface VisualizationPayload {
  xLabel: string;
  yLabel: string;
  points: ClusterPoint[];
  clusterSizes: Array<{ name: string; size: number }>;
}

export function Analytics() {
  const [selectedFeatureSet, setSelectedFeatureSet] = useState('moves');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('kmeans');
  const [parameters, setParameters] = useState<Record<string, string>>({
    'Количество кластеров (k)': '3',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [visualization, setVisualization] = useState<VisualizationPayload | null>(null);

  const currentAlgorithm = algorithms.find(a => a.id === selectedAlgorithm);
  const selectedClusterName = selectedCluster ? clusters.find(c => c.id === selectedCluster)?.name : null;
  const visiblePoints = selectedClusterName && visualization
    ? visualization.points.filter(point => point.clusterName === selectedClusterName)
    : visualization?.points ?? [];

  const handleRunClustering = async () => {
    setIsRunning(true);
    toast.info('Запуск кластеризации...');
    try {
      const result = await runClustering({ featureSet: selectedFeatureSet, algorithm: selectedAlgorithm, parameters });
      const palette = [
        'bg-red-100 border-red-300 text-red-900',
        'bg-blue-100 border-blue-300 text-blue-900',
        'bg-green-100 border-green-300 text-green-900',
        'bg-purple-100 border-purple-300 text-purple-900',
      ];
      setClusters(result.clusters.map((cluster, index) => ({
        id: cluster.id,
        name: cluster.name,
        bots: cluster.bots,
        characteristics: cluster.description,
        color: palette[index % palette.length],
      })));
      setVisualization(result.visualization ?? null);
      setSelectedCluster(null);
      setHasResults(true);
      toast.success('Кластеризация завершена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Кластеризация не выполнена');
    } finally {
      setIsRunning(false);
    }
  };

  const handleParameterChange = (param: string, value: string) => {
    setParameters(prev => ({ ...prev, [param]: value }));
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Аналитика' }]} />

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
            <p className="text-gray-600 mt-1">Кластеризация ботов по игровым показателям</p>
          </div>
          <Badge variant="warning">Экспериментально</Badge>
        </div>
      </div>

      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <CardBody>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 mb-1">Как выполняется анализ</p>
              <p className="text-sm text-yellow-800">
                Система рассчитывает признаки ботов, группирует их и строит диаграммы по выбранным параметрам.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-gray-900">Набор признаков</h2></CardHeader>
            <CardBody className="space-y-3">
              {featureSets.map(set => (
                <label key={set.id} className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${selectedFeatureSet === set.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="featureSet" value={set.id} checked={selectedFeatureSet === set.id} onChange={(e) => setSelectedFeatureSet(e.target.value)} className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{set.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{set.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-gray-900">Алгоритм</h2></CardHeader>
            <CardBody>
              <select value={selectedAlgorithm} onChange={(e) => setSelectedAlgorithm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
                {algorithms.map(algorithm => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}
              </select>

              <div className="space-y-3">
                {currentAlgorithm?.params.map(param => (
                  <div key={param}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{param}</label>
                    <input type="text" value={parameters[param] || ''} onChange={(e) => handleParameterChange(param, e.target.value)} placeholder="Введите значение" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Button onClick={handleRunClustering} loading={isRunning} className="w-full">
            <Play className="w-4 h-4" />
            Запустить анализ
          </Button>
        </div>

        <div className="lg:col-span-2">
          {!hasResults ? (
            <Card>
              <CardBody>
                <div className="text-center py-24">
                  <Sparkles className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Результаты ещё не построены</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Выберите признаки и алгоритм, затем нажмите «Запустить анализ». Результаты появятся в этом блоке.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Кластеры ботов</h2>
                    <Badge variant="success">{clusters.length} групп</Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {clusters.map(cluster => (
                      <button key={cluster.id} onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)} className={`p-4 border-2 rounded-lg text-left transition-all ${cluster.color} ${selectedCluster === cluster.id ? 'ring-2 ring-blue-500' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold">{cluster.name}</h3>
                          <Badge variant="default">{cluster.bots.length}</Badge>
                        </div>
                        <p className="text-sm mb-3">{cluster.characteristics}</p>
                        <div className="flex items-center gap-1 text-xs"><Users className="w-4 h-4" />{cluster.bots.join(', ') || 'нет ботов'}</div>
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Визуализация кластеров</h2>
                    {selectedClusterName && <Badge variant="info">Фильтр: {selectedClusterName}</Badge>}
                  </div>
                </CardHeader>
                <CardBody>
                  {!visualization || visualization.points.length === 0 ? (
                    <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                      Недостаточно данных для построения диаграммы
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="h-80 rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Точки ботов по признакам</p>
                        <ResponsiveContainer width="100%" height="90%">
                          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" name={visualization.xLabel} label={{ value: visualization.xLabel, position: 'insideBottom', offset: -8 }} />
                            <YAxis dataKey="y" name={visualization.yLabel} label={{ value: visualization.yLabel, angle: -90, position: 'insideLeft' }} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number | string) => value} labelFormatter={() => ''} />
                            <Scatter name="Боты" data={visiblePoints}>
                              {visiblePoints.map((point) => (
                                <Cell key={point.id} fill={chartColors[(point.clusterId - 1) % chartColors.length]} />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-80 rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Размеры кластеров</p>
                        <ResponsiveContainer width="100%" height="90%">
                          <BarChart data={visualization.clusterSizes} margin={{ top: 10, right: 10, bottom: 45, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="size" name="Ботов в группе">
                              {visualization.clusterSizes.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {selectedCluster !== null && (
                <Card>
                  <CardHeader><h2 className="text-lg font-semibold text-gray-900">Детали кластера</h2></CardHeader>
                  <CardBody>
                    {clusters.filter(c => c.id === selectedCluster).map(cluster => (
                      <div key={cluster.id} className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{cluster.name}</h3>
                          <p className="text-gray-600">{cluster.characteristics}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Боты в группе</h4>
                          <div className="flex flex-wrap gap-2">
                            {cluster.bots.map(bot => <Badge key={bot} variant="info">{bot}</Badge>)}
                            {cluster.bots.length === 0 && <span className="text-sm text-gray-500">Боты не попали в эту группу</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardBody>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Результаты анализа</p>
              <p>Кластеры, точки диаграммы и размеры групп рассчитываются после запуска анализа.</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

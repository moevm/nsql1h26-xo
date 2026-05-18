import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Save,
  Download,
  Share2,
  Plus,
  X,
  BarChart3,
  LineChart,
  PieChart,
  Table as TableIcon,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { previewReport, saveReport } from '../api/client';
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const datasets = ['Матчи', 'Ходы', 'Ошибки'];
const metrics = ['Винрейт', 'Среднее ходов', 'Длительность', 'Количество ошибок'];
const groupByOptions = ['Бот', 'Правила', 'Дата', 'Нет группировки'];
const chartTypes = [
  { id: 'line', name: 'Линейный', icon: LineChart },
  { id: 'bar', name: 'Столбчатый', icon: BarChart3 },
  { id: 'pie', name: 'Круговой', icon: PieChart },
  { id: 'table', name: 'Таблица', icon: TableIcon },
];

const chartColors = ['#2563eb', '#16a34a', '#9333ea', '#dc2626', '#f59e0b', '#0891b2'];

interface Filter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ReportMetric {
  key: string;
  label: string;
}

interface ReportPreview {
  chartType: string;
  groupBy: string;
  metrics: ReportMetric[];
  rows: Array<Record<string, string | number>>;
  columns: string[];
  generatedAt: string;
}

function downloadTextFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, string | number>>, metricsForCsv: ReportMetric[]) {
  const headers = ['Группа', 'Матчей', ...metricsForCsv.map(metric => metric.label)];
  const keys = ['name', 'matches', ...metricsForCsv.map(metric => metric.key)];
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\n');
}

export function ReportBuilder() {
  const navigate = useNavigate();
  const [reportName, setReportName] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('Матчи');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('Нет группировки');
  const [chartType, setChartType] = useState('bar');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const addFilter = () => {
    const newFilter: Filter = {
      id: Date.now().toString(),
      field: 'Статус',
      operator: '=',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof Filter, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const validate = () => {
    const errors = [];
    if (!reportName.trim()) errors.push('Название отчёта обязательно');
    if (selectedMetrics.length === 0) errors.push('Выберите хотя бы одну метрику');
    return errors;
  };

  const buildPayload = () => ({
    name: reportName || 'Предпросмотр отчёта',
    dataset: selectedDataset,
    metrics: selectedMetrics,
    groupBy,
    chartType,
    filters,
  });

  const refreshPreview = async (silent = false) => {
    if (selectedMetrics.length === 0) {
      setPreviewData(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const data = await previewReport(buildPayload()) as ReportPreview;
      setPreviewData(data);
      if (!silent) toast.success('Предпросмотр обновлён');
    } catch (err) {
      setPreviewData(null);
      if (!silent) toast.error(err instanceof Error ? err.message : 'Не удалось построить предпросмотр');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMetrics.length === 0) {
      setPreviewData(null);
      return;
    }

    const timer = window.setTimeout(() => {
      refreshPreview(true);
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataset, selectedMetrics, groupBy, chartType, filters, reportName]);

  const handleSave = async () => {
    const errors = validate();
    if (errors.length > 0) {
      setShowValidation(true);
      toast.error('Пожалуйста, исправьте ошибки');
      return;
    }
    try {
      await saveReport(buildPayload());
      toast.success('Отчёт сохранён');
      navigate('/statistics');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить отчёт');
    }
  };

  const handleSaveTemplate = async () => {
    if (selectedMetrics.length === 0) {
      setShowValidation(true);
      toast.error('Выберите хотя бы одну метрику');
      return;
    }
    await refreshPreview(false);
  };

  const handleExportCSV = () => {
    if (!previewData || previewData.rows.length === 0) {
      toast.error('Сначала постройте предпросмотр');
      return;
    }
    downloadTextFile(toCsv(previewData.rows, previewData.metrics), `${reportName || 'report'}.csv`, 'text/csv;charset=utf-8');
    toast.success('CSV отчёта скачан');
  };

  const handleExportJSON = () => {
    if (!previewData) {
      toast.error('Сначала постройте предпросмотр');
      return;
    }
    downloadTextFile(JSON.stringify(previewData, null, 2), `${reportName || 'report'}.json`, 'application/json;charset=utf-8');
    toast.success('JSON отчёта скачан');
  };

  const handleShare = () => {
    toast.info('Функция "Поделиться ссылкой" будет доступна позже');
  };

  const errors = showValidation ? validate() : [];
  const hasData = selectedMetrics.length > 0;
  const activeMetrics = previewData?.metrics ?? [];
  const chartRows = previewData?.rows ?? [];
  const firstMetric = activeMetrics[0];

  const numericRows = useMemo(() => chartRows.map(row => ({ ...row })), [chartRows]);

  const renderPreview = () => {
    if (!hasData) {
      return (
        <div className="h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Lightbulb className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Начните создавать отчёт</h3>
            <div className="text-sm space-y-1 max-w-md mx-auto">
              <p>1. Выберите источник данных слева</p>
              <p>2. Отметьте нужные метрики</p>
              <p>3. Настройте группировку и фильтры</p>
              <p>4. Предпросмотр появится в этом блоке</p>
            </div>
          </div>
        </div>
      );
    }

    if (isPreviewLoading) {
      return <div className="h-96 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">Строю предпросмотр...</div>;
    }

    if (!previewData || chartRows.length === 0) {
      return <div className="h-96 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500">По выбранным параметрам данных нет</div>;
    }

    if (chartType === 'table') {
      return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Группа</th>
                <th className="text-left px-4 py-3">Матчей</th>
                {activeMetrics.map(metric => <th key={metric.key} className="text-left px-4 py-3">{metric.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {chartRows.map(row => (
                <tr key={String(row.name)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600">{row.matches}</td>
                  {activeMetrics.map(metric => <td key={metric.key} className="px-4 py-3 text-gray-600">{row[metric.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (chartType === 'pie' && firstMetric) {
      return (
        <div className="h-96 rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Tooltip />
              <Legend />
              <Pie data={numericRows} dataKey={firstMetric.key} nameKey="name" outerRadius={120} label>
                {numericRows.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
            </RePieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'line') {
      return (
        <div className="h-96 rounded-lg border border-gray-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={numericRows} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Legend />
              {activeMetrics.map((metric, index) => (
                <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={chartColors[index % chartColors.length]} strokeWidth={2} />
              ))}
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-96 rounded-lg border border-gray-200 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={numericRows} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} />
            <YAxis />
            <Tooltip />
            <Legend />
            {activeMetrics.map((metric, index) => (
              <Bar key={metric.key} dataKey={metric.key} name={metric.label} fill={chartColors[index % chartColors.length]} />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Статистика', href: '/statistics' },
        { label: 'Конструктор отчёта' },
      ]} />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Название отчёта</label>
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showValidation && !reportName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Например: Статистика побед за февраль"
          />
          {showValidation && !reportName && (
            <p className="mt-1 text-sm text-red-600">Название обязательно</p>
          )}
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4" />
          Сохранить отчёт
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Источник данных</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {datasets.map(dataset => (
                  <button
                    key={dataset}
                    onClick={() => setSelectedDataset(dataset)}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors text-left ${
                      selectedDataset === dataset
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">{dataset}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dataset === 'Матчи' && 'Данные о завершённых матчах'}
                      {dataset === 'Ходы' && 'Информация о каждом ходе'}
                      {dataset === 'Ошибки' && 'Логи ошибок и сбоев'}
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Метрики</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {metrics.map(metric => (
                  <label key={metric} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric)}
                      onChange={() => toggleMetric(metric)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{metric}</span>
                  </label>
                ))}
              </div>
              {showValidation && selectedMetrics.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Выберите хотя бы одну метрику</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Группировка</h2>
            </CardHeader>
            <CardBody>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {groupByOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
                <Button variant="ghost" onClick={addFilter}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {filters.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <p>Нет фильтров</p>
                  <p className="text-xs mt-1">Нажмите + для добавления</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filters.map(filter => (
                    <div key={filter.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Фильтр</span>
                        <button onClick={() => removeFilter(filter.id)} className="text-gray-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <select value={filter.field} onChange={(e) => updateFilter(filter.id, 'field', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Статус</option>
                          <option>Бот</option>
                          <option>Правила</option>
                          <option>Дата</option>
                        </select>
                        <select value={filter.operator} onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="=">=</option>
                          <option value="!=">≠</option>
                          <option value=">">{'>'}</option>
                          <option value="<">{'<'}</option>
                          <option value="contains">содержит</option>
                        </select>
                        <input type="text" value={filter.value} onChange={(e) => updateFilter(filter.id, 'value', e.target.value)} placeholder="Значение" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Тип визуализации</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-3">
                {chartTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      className={`p-4 rounded-lg border transition-colors ${
                        chartType === type.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${chartType === type.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${chartType === type.id ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>{type.name}</p>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Предпросмотр</h2>
                {previewData && <Badge variant="info">{chartRows.length} строк</Badge>}
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {hasData && (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{reportName || 'Без названия'}</h3>
                      <p className="text-sm text-gray-600">Источник: {selectedDataset} • Группировка: {groupBy}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {selectedMetrics.map(metric => <Badge key={metric} variant="info">{metric}</Badge>)}
                    </div>
                  </div>
                )}

                {renderPreview()}

                {activeMetrics.length > 0 && (
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-gray-700 font-medium">Легенда:</span>
                    {activeMetrics.map((metric, idx) => (
                      <div key={metric.key} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColors[idx % chartColors.length] }} />
                        <span className="text-gray-600">{metric.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {errors.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardBody>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">Необходимо исправить:</p>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {errors.map((error, idx) => <li key={idx}>{error}</li>)}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {hasData && errors.length === 0 && previewData && (
            <Card className="bg-green-50 border-green-200">
              <CardBody>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-1">Предпросмотр отчёта готов</p>
                    <p className="text-green-800">Можно сохранить отчёт или экспортировать рассчитанные строки.</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={handleSaveTemplate} loading={isPreviewLoading}>
              Обновить предпросмотр
            </Button>
            <div className="flex gap-3 flex-wrap justify-end">
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download className="w-4 h-4" />
                Экспорт CSV
              </Button>
              <Button variant="secondary" onClick={handleExportJSON}>
                <Download className="w-4 h-4" />
                Экспорт JSON
              </Button>
              <Button variant="ghost" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                Поделиться ссылкой
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

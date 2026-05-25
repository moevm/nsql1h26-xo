import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart as ReBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/Badge';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { Card, CardBody, CardHeader } from '../components/Card';
import { CustomReportPayload, ReportFilterConfig, SavedReport, getCurrentUser, getSavedReports, previewReport, saveReport } from '../api/client';
import { canViewLogs } from '../auth/permissions';

const datasetFields: Record<string, string[]> = {
  Матчи: ['Дата', 'Статус', 'Результат', 'Правила', 'Бот A', 'Бот B', 'Победитель', 'Ходы', 'Длительность, сек'],
  Боты: ['Название', 'Язык', 'Версия', 'Статус', 'Видимость', 'Владелец', 'ELO', 'Матчи', 'Победы', 'Поражения'],
  Логи: ['Дата', 'Тип', 'Уровень', 'Матч', 'Размер'],
};

const chartColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#be123c'];
const operators = [
  { value: 'contains', label: 'содержит' },
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
];

function makeFilter(field: string): ReportFilterConfig {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    field,
    operator: 'contains',
    value: '',
  };
}

function sanitizeChartRows(rows: Array<Record<string, string | number>>, series: string[]) {
  return rows.map((row) => {
    const next: Record<string, string | number> = { ...row };
    series.forEach((item) => {
      next[item] = Number(row[item] || 0);
    });
    return next;
  });
}

function normalizeSavedFilters(value: unknown, fields: string[], reportId: string): ReportFilterConfig[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : `saved-${reportId}-${index}`,
      field: typeof item.field === 'string' && fields.includes(item.field) ? item.field : fields[0] || '',
      operator: typeof item.operator === 'string' ? item.operator : 'contains',
      value: typeof item.value === 'string' ? item.value : String(item.value ?? ''),
    }))
    .filter((item) => item.field);
}

export function ReportBuilder() {
  const [reportName, setReportName] = useState('Кастомная статистика по матчам');
  const [dataset, setDataset] = useState('Матчи');
  const [axisX, setAxisX] = useState('Правила');
  const [axisY, setAxisY] = useState('Статус');
  const [chartType, setChartType] = useState<'bar' | 'table'>('bar');
  const [filters, setFilters] = useState<ReportFilterConfig[]>([makeFilter('Статус')]);
  const [preview, setPreview] = useState<CustomReportPayload | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const canUseLogDataset = canViewLogs(getCurrentUser());
  const availableDatasetFields = useMemo(() => {
    if (canUseLogDataset) return datasetFields;
    const { Логи: _logs, ...publicDatasets } = datasetFields;
    return publicDatasets;
  }, [canUseLogDataset]);
  const fields = availableDatasetFields[dataset] || [];
  const chartRows = useMemo(() => sanitizeChartRows(preview?.rows || [], preview?.series || []), [preview]);
  const hasData = Boolean(preview && preview.rows.length > 0 && preview.series.length > 0);

  useEffect(() => {
    if (!availableDatasetFields[dataset]) {
      handleDatasetChange('Матчи');
    }
  }, [availableDatasetFields, dataset]);

  useEffect(() => {
    let mounted = true;
    setLoadingSaved(true);
    getSavedReports()
      .then((items) => {
        if (mounted) setSavedReports(items);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить сохранённые отчёты'))
      .finally(() => {
        if (mounted) setLoadingSaved(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const payload = () => ({
    name: reportName.trim() || 'Кастомный отчёт',
    dataset,
    axisX,
    axisY,
    chartType,
    filters: filters.filter((filter) => filter.value.trim()),
  });

  const validate = () => {
    const errors = [];
    if (!reportName.trim()) errors.push('Введите название отчёта');
    if (!axisX) errors.push('Выберите атрибут для оси X');
    if (!axisY) errors.push('Выберите атрибут для оси Y');
    if (axisX === axisY) errors.push('Для наглядной диаграммы выберите разные атрибуты X и Y');
    return errors;
  };

  const errors = showValidation ? validate() : [];

  const handleDatasetChange = (value: string) => {
    const nextFields = availableDatasetFields[value] || [];
    setDataset(value);
    setAxisX(nextFields[0] || '');
    setAxisY(nextFields[1] || nextFields[0] || '');
    setFilters([makeFilter(nextFields[1] || nextFields[0] || '')]);
    setPreview(null);
  };

  const addFilter = () => setFilters((items) => [...items, makeFilter(fields[0] || '')]);
  const removeFilter = (id: string) => setFilters((items) => items.filter((item) => item.id !== id));
  const updateFilter = (id: string, key: keyof ReportFilterConfig, value: string) => {
    setFilters((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  };

  const buildPreview = async () => {
    setShowValidation(true);
    const currentErrors = validate();
    if (currentErrors.length > 0) return;

    setLoadingPreview(true);
    try {
      const data = await previewReport(payload());
      setPreview(data);
      if (data.totalRecords === 0) {
        toast.warning('По заданным фильтрам данных не найдено');
      } else {
        toast.success('Диаграмма построена');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось построить отчёт');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    setShowValidation(true);
    const currentErrors = validate();
    if (currentErrors.length > 0) return;
    if (!preview) {
      toast.warning('Сначала постройте диаграмму, потом сохраните результат');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveReport(payload());
      setSavedReports((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      toast.success(`Отчёт ${saved.id} сохранён и появился в списке ниже`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить отчёт');
    } finally {
      setSaving(false);
    }
  };

  const openSavedReport = (report: SavedReport) => {
    const config = report.config || {};
    const nextDataset = typeof config.dataset === 'string' && availableDatasetFields[config.dataset] ? config.dataset : 'Матчи';
    const nextFields = availableDatasetFields[nextDataset] || [];
    const nextAxisX = typeof config.axisX === 'string' && nextFields.includes(config.axisX) ? config.axisX : nextFields[0] || '';
    const nextAxisY = typeof config.axisY === 'string' && nextFields.includes(config.axisY) ? config.axisY : nextFields[1] || nextFields[0] || '';
    const nextFilters = normalizeSavedFilters(config.filters, nextFields, report.id);

    setReportName(typeof config.name === 'string' ? config.name : report.name);
    setDataset(nextDataset);
    setAxisX(nextAxisX);
    setAxisY(nextAxisY);
    setChartType(config.chartType === 'table' ? 'table' : 'bar');
    setFilters(nextFilters.length > 0 ? nextFilters : [makeFilter(nextAxisY || nextAxisX)]);
    setPreview(report.preview || null);
    setShowValidation(false);
    toast.info(`Открыт сохранённый отчёт ${report.id}`);
  };

  const renderPreview = () => {
    if (!preview) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
          <Wand2 className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-gray-700">Настройте фильтры и оси X/Y</p>
          <p className="text-sm mt-1">После нажатия «Построить» здесь появится диаграмма по данным из БД.</p>
        </div>
      );
    }

    if (preview.rows.length === 0) {
      return <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">По текущим фильтрам нет данных для диаграммы.</div>;
    }

    if (chartType === 'table') {
      return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">{preview.axisX}</th>
                {preview.series.map((item) => (
                  <th key={item} className="px-4 py-3 text-left font-medium text-gray-700">{item}</th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-gray-700">Итого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preview.rows.map((row) => (
                <tr key={String(row.name)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                  {preview.series.map((item) => <td key={item} className="px-4 py-3 text-gray-700">{row[item] || 0}</td>)}
                  <td className="px-4 py-3 text-gray-900 font-medium">{row.total || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="h-[440px] rounded-lg border border-gray-200 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={chartRows} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-25} textAnchor="end" height={100} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            {preview.series.map((item, index) => (
              <Bar key={item} dataKey={item} name={item} stackId="custom-report" fill={chartColors[index % chartColors.length]} />
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
        { label: 'Кастомный отчёт' },
      ]} />

      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Кастомный отчёт</h1>
          <p className="text-gray-600 mt-1">Многокритериальный фильтр, выбор осей X/Y и построение диаграммы по данным из БД</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={buildPreview} loading={loadingPreview}>
            <Wand2 className="w-4 h-4" />
            Построить
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!preview}>
            <Save className="w-4 h-4" />
            Сохранить результат
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-gray-900">Основные параметры</h2></CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Название отчёта</label>
                <input
                  value={reportName}
                  onChange={(event) => setReportName(event.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${showValidation && !reportName.trim() ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Источник данных</label>
                <select value={dataset} onChange={(event) => handleDatasetChange(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.keys(availableDatasetFields).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ось X</label>
                  <select value={axisX} onChange={(event) => setAxisX(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {fields.map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ось Y</label>
                  <select value={axisY} onChange={(event) => setAxisY(event.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {fields.map((field) => <option key={field} value={field}>{field}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Визуализация</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setChartType('bar')} className={`px-3 py-2 rounded-lg border ${chartType === 'bar' ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-gray-300 text-gray-700'}`}>Диаграмма</button>
                  <button type="button" onClick={() => setChartType('table')} className={`px-3 py-2 rounded-lg border ${chartType === 'table' ? 'bg-blue-50 border-blue-300 text-blue-900' : 'border-gray-300 text-gray-700'}`}>Таблица</button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Многокритериальные фильтры</h2>
                <Button variant="ghost" onClick={addFilter}><Plus className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {filters.map((filter) => (
                  <div key={filter.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Условие фильтра</span>
                      <button type="button" onClick={() => removeFilter(filter.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2">
                      <select value={filter.field} onChange={(event) => updateFilter(filter.id, 'field', event.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {fields.map((field) => <option key={field} value={field}>{field}</option>)}
                      </select>
                      <select value={filter.operator} onChange={(event) => updateFilter(filter.id, 'operator', event.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                      </select>
                      <input value={filter.value} onChange={(event) => updateFilter(filter.id, 'value', event.target.value)} placeholder="Значение" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Текстовые условия ищут без учёта регистра и по подстроке.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-gray-900">Сохранённые отчёты</h2></CardHeader>
            <CardBody>
              {loadingSaved && <p className="text-sm text-gray-500">Загрузка списка...</p>}
              {!loadingSaved && savedReports.length === 0 && (
                <p className="text-sm text-gray-500">Пока ничего не сохранено. Постройте диаграмму и нажмите «Сохранить результат».</p>
              )}
              {!loadingSaved && savedReports.length > 0 && (
                <div className="space-y-3">
                  {savedReports.slice(0, 6).map((report) => (
                    <div key={report.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{report.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{report.id} • {report.createdAtLabel || report.created_at || 'дата не указана'}</p>
                        </div>
                        <Button variant="ghost" onClick={() => openSavedReport(report)} className="text-sm px-2 py-1">Открыть</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {errors.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardBody>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">Нужно исправить:</p>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Предпросмотр диаграммы</h2>
                  <p className="text-sm text-gray-500">X: {axisX} • Y: {axisY}</p>
                </div>
                {preview && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{preview.totalRecords} записей</Badge>
                    <Badge variant="default">{preview.dataset}</Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
                Диаграмма считает количество записей для каждой пары значений: выбранный атрибут по оси X и выбранный атрибут по оси Y.
              </div>
              {renderPreview()}
            </CardBody>
          </Card>

          {hasData && (
            <Card>
              <CardHeader><h2 className="text-lg font-semibold text-gray-900">Расшифровка</h2></CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {preview?.series.map((item) => <Badge key={item} variant="default">{item}</Badge>)}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

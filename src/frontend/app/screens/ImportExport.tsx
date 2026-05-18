import { useEffect, useState } from 'react';
import { Card, CardBody } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Upload, Download, FileText, CheckCircle2, XCircle, AlertCircle, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_IMPORT_UPLOAD_BYTES, exportData, formatFileSize, getImportExportHistory, importData } from '../api/client';

const entities = ['Все данные'];
const formats = ['JSON'];

interface ImportHistory {
  id: string;
  type: 'import' | 'export';
  entity: string;
  format: string;
  status: 'success' | 'error' | 'in_progress';
  timestamp: string;
  recordsCount: number;
}

interface PreviewRow {
  collection: string;
  count: number;
}

export function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importEntity, setImportEntity] = useState('Все данные');
  const [importFormat, setImportFormat] = useState('JSON');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [exportEntity, setExportEntity] = useState('Все данные');
  const [exportFormat, setExportFormat] = useState('JSON');
  const [includeNested, setIncludeNested] = useState(true);
  const [history, setHistory] = useState<ImportHistory[]>([]);

  const loadHistory = () => {
    getImportExportHistory()
      .then((items) => setHistory(items.map((item) => ({
        id: item.id,
        type: item.type === 'export' ? 'export' : 'import',
        entity: item.entity,
        format: item.format,
        status: item.status === 'empty' ? 'success' : item.status,
        timestamp: item.createdAt || item.timestamp || '-',
        recordsCount: item.rows ?? item.recordsCount ?? 0,
      }))))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить историю операций'));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const buildPreview = async (file: File) => {
    const errors: string[] = [];
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.json')) {
      errors.push('Для полного импорта приложения используется JSON-дамп');
      setPreviewRows([]);
      return errors;
    }

    if (file.size > MAX_IMPORT_UPLOAD_BYTES) {
      errors.push(`Файл импорта слишком большой: ${formatFileSize(file.size)}. Максимум: ${formatFileSize(MAX_IMPORT_UPLOAD_BYTES)}.`);
      setPreviewRows([]);
      return errors;
    }

    if (file.size === 0) {
      errors.push('Файл пустой. Выберите корректный JSON-дамп.');
      setPreviewRows([]);
      return errors;
    }

    try {
      const dump = JSON.parse(await file.text());
      const collections = dump?.collections;
      if (!collections || typeof collections !== 'object' || Array.isArray(collections)) {
        errors.push('Ожидался дамп всего приложения с корневым полем collections');
        setPreviewRows([]);
        return errors;
      }

      setPreviewRows(Object.entries(collections).map(([collection, rows]) => ({
        collection,
        count: Array.isArray(rows) ? rows.length : 0,
      })));
    } catch {
      errors.push('Файл не является корректным JSON');
      setPreviewRows([]);
    }

    return errors;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setShowPreview(true);
    setValidationErrors(await buildPreview(file));
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportProgress(20);
    try {
      const form = new FormData();
      form.append('entity', importEntity);
      form.append('format', importFormat);
      form.append('file', importFile);
      setImportProgress(60);
      const result = await importData(form);
      setImportProgress(100);
      toast.success(result.message);
      setShowPreview(false);
      setImportFile(null);
      setPreviewRows([]);
      setValidationErrors([]);
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось выполнить импорт');
    } finally {
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 500);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportData({ entity: exportEntity, format: exportFormat, includeNested });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bot-arena-full-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Экспорт всего приложения сформирован');
      loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось выполнить экспорт');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Импорт/Экспорт</h1>
        <p className="text-gray-600 mt-1">Импорт и экспорт полного набора данных приложения</p>
      </div>

      <Card className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2"><Upload className="w-4 h-4" />Импорт</div>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'export' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2"><Download className="w-4 h-4" />Экспорт</div>
            </button>
          </nav>
        </div>

        <CardBody>
          {activeTab === 'import' ? (
            <div className="space-y-6">
              {!showPreview ? (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Объём операции</label>
                      <select value={importEntity} onChange={(e) => setImportEntity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {entities.map(entity => <option key={entity} value={entity}>{entity}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Формат</label>
                      <select value={importFormat} onChange={(e) => setImportFormat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {formats.map(format => <option key={format} value={format}>{format}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Файл для импорта</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-700 mb-2">
                        Перетащите JSON-дамп сюда или{' '}
                        <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                          выберите файл
                          <input type="file" className="hidden" accept=".json,application/json" onChange={handleFileUpload} />
                        </label>
                      </p>
                      <p className="text-sm text-gray-500">Одна кнопка импортирует все коллекции приложения. Максимальный размер: {formatFileSize(MAX_IMPORT_UPLOAD_BYTES)}.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-1">Предпросмотр дампа</h3>
                    {importFile && (
                      <p className="text-sm text-gray-600 mb-3">Файл: {importFile.name}, размер: {formatFileSize(importFile.size)}</p>
                    )}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Коллекция</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Записей</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {previewRows.map(row => (
                            <tr key={row.collection} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm font-mono">{row.collection}</td>
                              <td className="px-4 py-2 text-sm">{row.count}</td>
                            </tr>
                          ))}
                          {previewRows.length === 0 && (
                            <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-500">Предпросмотр недоступен</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Предпросмотр построен по выбранному JSON-файлу</p>
                  </div>

                  {validationErrors.length > 0 && (
                    <Card className="bg-red-50 border-red-200">
                      <CardBody>
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-red-900 mb-2">Обнаружены ошибки валидации</p>
                            <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                              {validationErrors.map((error, idx) => <li key={idx}>{error}</li>)}
                            </ul>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {isImporting && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Импорт данных...</span>
                        <span className="text-sm text-gray-600">{importProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${importProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => { setShowPreview(false); setImportFile(null); setPreviewRows([]); setValidationErrors([]); }} disabled={isImporting}>Отмена</Button>
                    <Button onClick={handleConfirmImport} disabled={isImporting || validationErrors.length > 0}>Импортировать всё приложение</Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Объём операции</label>
                  <select value={exportEntity} onChange={(e) => setExportEntity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {entities.map(entity => <option key={entity} value={entity}>{entity}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Формат</label>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {formats.map(format => <option key={format} value={format}>{format}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={includeNested} onChange={(e) => setIncludeNested(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <div>
                  <span className="font-medium text-gray-900">Включить все коллекции</span>
                  <p className="text-sm text-gray-600">Экспортируется полный набор данных приложения</p>
                </div>
              </label>

              <Card className="bg-blue-50 border-blue-200">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Экспорт выполняется одним действием</p>
                      <p>Одна кнопка формирует файл со всеми данными приложения: пользователи, боты, версии, статистика, матчи, события, отчёты, настройки и история операций.</p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4" />
                Сгенерировать и скачать полный дамп
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">История операций</h2>
          <div className="space-y-3">
            {history.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${item.type === 'import' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {item.type === 'import' ? <Upload className="w-5 h-5 text-blue-600" /> : <Download className="w-5 h-5 text-green-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{item.type === 'import' ? 'Импорт' : 'Экспорт'} {item.entity}</span>
                      <Badge variant={item.status === 'success' ? 'success' : item.status === 'error' ? 'error' : 'warning'}>
                        {item.status === 'success' ? 'Успешно' : item.status === 'error' ? 'Ошибка' : 'В процессе'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{item.format}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{item.timestamp}</span>
                      <span>{item.recordsCount} записей</span>
                    </div>
                  </div>
                </div>
                <div>
                  {item.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {item.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                  {item.status === 'in_progress' && <Clock className="w-5 h-5 text-yellow-600" />}
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="text-center text-gray-500 py-8">История операций пока пуста</div>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

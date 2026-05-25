export type UserRole = 'user' | 'moderator' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsersPayload {
  users: UserRecord[];
  roleCounts: Record<UserRole, number>;
  roles: UserRole[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BotRecord {
  id: string;
  name: string;
  language: string;
  version: string;
  tags: string[];
  status: string;
  uploadedBy: string;
  ownerLogin: string;
  visibility: string;
  created: string;
  updated: string;
  hash: string;
  description?: string;
  comment?: string;
  fileName?: string;
  sizeBytes?: number;
  matchesCount?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  elo?: number;
  runSettings?: { maxMoves: number; moveTimeoutMs: number };
}

export interface MatchEvent {
  id: string;
  seq: number;
  kind: 'move' | 'log' | 'status';
  ts: string;
  botId?: string;
  botName?: string;
  payload: Record<string, any>;
}

export interface MatchRecord {
  id: string;
  botAId: string;
  botAName: string;
  botBId: string;
  botBName: string;
  rules: string;
  status: string;
  result: string;
  winnerBotId?: string;
  winnerBotName?: string;
  started: string;
  finished?: string;
  durationMs?: number;
  movesCount: number;
  logCount: number;
  statusHistory: Array<{ status: string; time: string }>;
  board?: Record<string, any>;
  winCondition?: number;
  events?: MatchEvent[];
  comment?: string;
}

export interface LogRecord {
  id: string;
  type: string;
  relatedMatch: string;
  level: string;
  startTime: string;
  endTime?: string;
  size: string;
  content?: string;
  note?: string;
}

export interface OverviewSummary {
  bots: number;
  matches: number;
  logs: number;
  activeBots: number;
  failedMatches: number;
  recentMatches: MatchRecord[];
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export const MAX_BOT_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_UPLOAD_BYTES = 20 * 1024 * 1024;

export function formatFileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1).replace('.0', '')} МБ`;
  if (value >= 1024) return `${(value / 1024).toFixed(1).replace('.0', '')} КБ`;
  return `${value} байт`;
}

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractErrorMessage(status: number, payload: unknown) {
  if (typeof payload === 'object' && payload && 'detail' in payload) {
    return String((payload as { detail: unknown }).detail);
  }

  if (status === 413) {
    return `Файл слишком большой. Бот: до ${formatFileSize(MAX_BOT_UPLOAD_BYTES)}, импорт: до ${formatFileSize(MAX_IMPORT_UPLOAD_BYTES)}.`;
  }
  if (status === 415) return 'Неподдерживаемый тип файла';
  if (status === 502 || status === 503 || status === 504) return 'Сервис временно недоступен. Проверьте, что контейнеры запущены.';
  if (status === 401) return 'Нужно войти в систему';
  if (status === 403) return 'Недостаточно прав для операции';

  if (typeof payload === 'string') {
    const text = payload.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) return text.slice(0, 300);
  }

  return 'Ошибка запроса';
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(error instanceof Error ? `Не удалось отправить запрос: ${error.message}` : 'Не удалось отправить запрос');
  }

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(response.status, payload));
  }

  return payload as T;
}

function query(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) q.set(key, value.trim());
  });
  const asString = q.toString();
  return asString ? `?${asString}` : '';
}

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('auth_token'));
}

export function getOverview() {
  return request<OverviewSummary>('/overview');
}

export function getBots(filters: Record<string, string | undefined> = {}) {
  return request<PaginatedResponse<BotRecord>>(`/bots${query(filters)}`);
}

export function getBot(id: string) {
  return request<BotRecord>(`/bots/${id}`);
}

export function uploadBot(form: FormData) {
  return request<BotRecord>('/bots', { method: 'POST', body: form });
}

export function updateBot(id: string, payload: Partial<BotRecord> & { tags?: string[] }) {
  return request<BotRecord>(`/bots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function downloadBotSource(id: string, fallbackName = `${id}.py`) {
  const result = await requestDownload(`/bots/${id}/download`, {}, fallbackName);
  saveBlob(result.blob, result.filename);
  return result;
}

export async function downloadLogSource(id: string, fallbackName = `${id}.log`) {
  const result = await requestDownload(`/logs/${id}/download`, {}, fallbackName);
  saveBlob(result.blob, result.filename);
  return result;
}

export function getMatches(filters: Record<string, string | undefined> = {}) {
  return request<PaginatedResponse<MatchRecord>>(`/matches${query(filters)}`);
}

export function getMatch(id: string) {
  return request<MatchRecord>(`/matches/${id}`);
}

export function updateMatch(id: string, payload: Record<string, unknown>) {
  return request<MatchRecord>(`/matches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getLogs(filters: Record<string, string | undefined> = {}) {
  return request<PaginatedResponse<LogRecord>>(`/logs${query(filters)}`);
}

export function getLog(id: string) {
  return request<LogRecord>(`/logs/${id}`);
}

export function updateLog(id: string, payload: Record<string, unknown>) {
  return request<LogRecord>(`/logs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export interface StatisticsSummary {
  averageWinrate: number;
  averageMoves: number;
  averageDuration: string;
  errorRate: number;
  totalMatches: number;
  finishedMatches: number;
  failedMatches: number;
  errorLogs: number;
}

export interface BotRanking {
  rank: number;
  id: string;
  name: string;
  winrate: number;
  games: number;
  avgDuration: string;
  elo: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StatisticsPayload {
  summary: StatisticsSummary;
  rankings: BotRanking[];
  charts: Record<string, any>;
}

export interface GlobalSearchPayload {
  bots: BotRecord[];
  matches: MatchRecord[];
  logs: LogRecord[];
}

export interface AppSettings {
  sandboxTimeLimit: number;
  sandboxMemoryLimit: number;
  defaultLogLevel: string;
  logRetention: string;
  updatedAt?: string;
}

export interface ImportExportHistoryItem {
  id: string;
  type: 'import' | 'export';
  entity: string;
  format: string;
  status: 'success' | 'error' | 'in_progress' | 'empty';
  createdAt?: string;
  timestamp?: string;
  rows?: number;
  recordsCount?: number;
  fileName?: string;
}


export interface ReportFilterConfig {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface CustomReportPayload {
  config: Record<string, unknown>;
  dataset: string;
  axisX: string;
  axisY: string;
  chartType: string;
  fields: Record<string, string[]>;
  series: string[];
  rows: Array<Record<string, string | number>>;
  totalRecords: number;
  generatedAt: string;
  summary?: StatisticsSummary;
}

export interface SavedReport {
  id: string;
  name: string;
  config: Record<string, unknown>;
  preview?: CustomReportPayload;
  created_by?: string;
  created_at?: string;
  createdAtLabel?: string;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
}

function filenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ''));
    } catch {
      return utf8Match[1].replace(/["']/g, '');
    }
  }

  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ? asciiMatch[1].trim() : fallback;
}

async function requestDownload(path: string, options: RequestInit = {}, fallbackFilename = 'download.bin'): Promise<DownloadResult> {
  const headers = new Headers(options.headers || {});
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(error instanceof Error ? `Не удалось скачать файл: ${error.message}` : 'Не удалось скачать файл');
  }

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(extractErrorMessage(response.status, payload));
  }

  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(response.headers.get('Content-Disposition'), fallbackFilename),
  };
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const result = await requestDownload(path, options);
  return result.blob;
}

export function register(name: string, email: string, password: string) {
  return request<{ token: string; user: AuthUser; message: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }).then((data) => {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  });
}

export function forgotPassword(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function createMatch(payload: Record<string, unknown>) {
  return request<MatchRecord>('/matches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getStatistics(filters: Record<string, string | undefined> = {}) {
  return request<StatisticsPayload>(`/statistics${query(filters)}`);
}

export function globalSearch(q: string) {
  return request<GlobalSearchPayload>(`/search${query({ q })}`);
}

export function getSettings() {
  return request<AppSettings>('/settings');
}

export function updateSettings(payload: Omit<AppSettings, 'updatedAt'>) {
  return request<AppSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function clearOldLogs() {
  return request<{ deleted: number; availableLogEvents: number }>('/settings/maintenance/clear-old-logs', { method: 'POST' });
}

export function archiveInactiveBots() {
  return request<{ archived: number }>('/settings/maintenance/archive-inactive-bots', { method: 'POST' });
}

export function getImportExportHistory() {
  return request<ImportExportHistoryItem[]>('/import-export/history');
}

export function importData(form: FormData) {
  return request<{ message: string; rows: number; operation: ImportExportHistoryItem }>('/import-export/imports', {
    method: 'POST',
    body: form,
  });
}

export function exportData(payload: Record<string, unknown>) {
  return requestBlob('/import-export/exports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function previewReport(payload: Record<string, unknown>) {
  return request<CustomReportPayload>('/reports/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveReport(payload: Record<string, unknown>) {
  return request<SavedReport>('/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSavedReports() {
  return request<SavedReport[]>('/reports');
}

export interface ClusterPoint {
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

export interface ClusteringResult {
  algorithm: string;
  featureSet: string;
  parameters: Record<string, string>;
  clusters: Array<{ id: number; name: string; size: number; bots: string[]; description: string }>;
  visualization: {
    xLabel: string;
    yLabel: string;
    points: ClusterPoint[];
    clusterSizes: Array<{ name: string; size: number }>;
  };
}

export function runClustering(payload: Record<string, unknown>) {
  return request<ClusteringResult>('/analytics/cluster', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getUsers(filters: Record<string, string | undefined> = {}) {
  return request<UsersPayload>(`/users${query(filters)}`);
}

export function updateUserRole(id: string, role: UserRole) {
  return request<UserRecord>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }).then((user) => {
    const current = getCurrentUser();
    if (current?.id === user.id) {
      localStorage.setItem('auth_user', JSON.stringify({ ...current, role: user.role }));
    }
    return user;
  });
}

export type UserRole = 'user' | 'moderator' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  events?: MatchEvent[];
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

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'detail' in payload ? String(payload.detail) : 'Ошибка запроса';
    throw new Error(message);
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
  return request<BotRecord[]>(`/bots${query(filters)}`);
}

export function getBot(id: string) {
  return request<BotRecord>(`/bots/${id}`);
}

export function uploadBot(form: FormData) {
  return request<BotRecord>('/bots', { method: 'POST', body: form });
}

export function getMatches(filters: Record<string, string | undefined> = {}) {
  return request<MatchRecord[]>(`/matches${query(filters)}`);
}

export function getMatch(id: string) {
  return request<MatchRecord>(`/matches/${id}`);
}

export function getLogs(filters: Record<string, string | undefined> = {}) {
  return request<LogRecord[]>(`/logs${query(filters)}`);
}

export function getLog(id: string) {
  return request<LogRecord>(`/logs/${id}`);
}

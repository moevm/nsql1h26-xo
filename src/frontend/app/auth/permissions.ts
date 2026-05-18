import type { AuthUser, UserRole } from '../api/client';
import { getCurrentUser } from '../api/client';

export const roleLabels: Record<UserRole, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Администратор',
};

export const roleDescriptions: Record<UserRole, string> = {
  user: 'Просмотр ботов, карточек, матчей, статистики и создание матчей.',
  moderator: 'Загрузка и редактирование ботов, работа с логами, импорт/экспорт, отчёты и аналитика.',
  admin: 'Полный доступ, настройки приложения и управление ролями пользователей.',
};

export function hasRole(user: AuthUser | null, allowedRoles: UserRole[]) {
  return Boolean(user && allowedRoles.includes(user.role));
}

export function currentUserHasRole(allowedRoles: UserRole[]) {
  return hasRole(getCurrentUser(), allowedRoles);
}

export function canManageBots(user: AuthUser | null = getCurrentUser()) {
  return hasRole(user, ['moderator', 'admin']);
}

export function canViewLogs(user: AuthUser | null = getCurrentUser()) {
  return hasRole(user, ['moderator', 'admin']);
}

export function canUseAnalysisTools(user: AuthUser | null = getCurrentUser()) {
  return hasRole(user, ['moderator', 'admin']);
}

export function canImportExport(user: AuthUser | null = getCurrentUser()) {
  return hasRole(user, ['moderator', 'admin']);
}

export function canManageSettings(user: AuthUser | null = getCurrentUser()) {
  return hasRole(user, ['moderator', 'admin']);
}

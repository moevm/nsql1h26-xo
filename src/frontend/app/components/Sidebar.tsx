import type { ComponentType } from 'react';
import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Bot,
  Swords,
  FileText,
  BarChart3,
  ArrowRightLeft,
  Settings,
  Search,
} from 'lucide-react';
import type { UserRole } from '../api/client';
import { getCurrentUser } from '../api/client';
import { hasRole } from '../auth/permissions';

const navItems: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; roles?: UserRole[] }> = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard, exact: true },
  { to: '/bots', label: 'Боты', icon: Bot },
  { to: '/matches', label: 'Матчи', icon: Swords },
  { to: '/logs', label: 'Логи', icon: FileText, roles: ['moderator', 'admin'] },
  { to: '/statistics', label: 'Статистика', icon: BarChart3 },
  { to: '/statistics/custom', label: 'Кастомный отчёт', icon: BarChart3 },
  { to: '/import-export', label: 'Импорт/Экспорт', icon: ArrowRightLeft, roles: ['moderator', 'admin'] },
  { to: '/search', label: 'Поиск', icon: Search },
  { to: '/settings', label: 'Настройки', icon: Settings, roles: ['moderator', 'admin'] },
];

export function Sidebar() {
  const user = getCurrentUser();
  const visibleItems = navItems.filter((item) => !item.roles || hasRole(user, item.roles));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Infinite Tic-Tac-Toe</h1>
        <p className="text-sm text-gray-500">Bot Arena</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

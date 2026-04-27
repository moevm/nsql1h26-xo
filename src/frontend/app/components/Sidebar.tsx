import { NavLink } from 'react-router';
import { LayoutDashboard, Bot, Swords, FileText } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Обзор', icon: LayoutDashboard, exact: true },
  { to: '/bots', label: 'Боты', icon: Bot },
  { to: '/matches', label: 'Матчи', icon: Swords },
  { to: '/logs', label: 'Логи', icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Infinite Tic-Tac-Toe</h1>
        <p className="text-sm text-gray-500">Bot Arena</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
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

import { Search, Bell, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getCurrentUser, logout } from '../api/client';

const roleNames: Record<string, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Администратор',
};

export function TopBar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const value = event.currentTarget.value.trim();
      navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по приложению..."
            onKeyDown={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" type="button">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">{roleNames[user?.role || 'user']}</div>
            <div className="text-gray-500">{user?.email || 'user@example.com'}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

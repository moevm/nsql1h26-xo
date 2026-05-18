import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Save, Trash2, Archive, AlertTriangle, Users, Database, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  type UserRecord,
  type UserRole,
  archiveInactiveBots,
  clearOldLogs,
  getCurrentUser,
  getSettings,
  getUsers,
  updateSettings,
  updateUserRole,
} from '../api/client';
import { roleDescriptions, roleLabels } from '../auth/permissions';

const logLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
const retentionPolicies = ['7 дней', '30 дней', '90 дней', '1 год', 'Бессрочно'];
const roleOptions: UserRole[] = ['user', 'moderator', 'admin'];

const roleBadgeVariant: Record<UserRole, 'default' | 'info' | 'success'> = {
  user: 'default',
  moderator: 'info',
  admin: 'success',
};

export function Settings() {
  const [sandboxTimeLimit, setSandboxTimeLimit] = useState('5000');
  const [sandboxMemoryLimit, setSandboxMemoryLimit] = useState('512');
  const [defaultLogLevel, setDefaultLogLevel] = useState('INFO');
  const [logRetention, setLogRetention] = useState('30 дней');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<UserRole, number>>({ user: 0, moderator: 0, admin: 0 });
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState('');
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [showArchiveBotsModal, setShowArchiveBotsModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const loadUsers = () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    getUsers({ q: userQuery, role: userRoleFilter })
      .then((payload) => {
        setUsers(payload.users);
        setRoleCounts({ user: payload.roleCounts.user || 0, moderator: payload.roleCounts.moderator || 0, admin: payload.roleCounts.admin || 0 });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить пользователей'))
      .finally(() => setUsersLoading(false));
  };

  useEffect(() => {
    getSettings()
      .then((settings) => {
        setSandboxTimeLimit(String(settings.sandboxTimeLimit));
        setSandboxMemoryLimit(String(settings.sandboxMemoryLimit));
        setDefaultLogLevel(settings.defaultLogLevel);
        setLogRetention(settings.logRetention);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить настройки'));
    if (isAdmin) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filteredRoleSummary = useMemo(() => roleOptions.map((role) => ({ role, count: roleCounts[role] || 0 })), [roleCounts]);

  const handleSave = async () => {
    try {
      await updateSettings({
        sandboxTimeLimit: Number(sandboxTimeLimit),
        sandboxMemoryLimit: Number(sandboxMemoryLimit),
        defaultLogLevel,
        logRetention,
      });
      toast.success('Настройки сохранены');
      setHasUnsavedChanges(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить настройки');
    }
  };

  const handleClearOldLogs = async () => {
    try {
      const result = await clearOldLogs();
      toast.success(`Операция выполнена, log-событий в системе: ${result.availableLogEvents}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось очистить логи');
    }
  };

  const handleArchiveInactiveBots = async () => {
    try {
      const result = await archiveInactiveBots();
      toast.success(`Архивировано ботов: ${result.archived}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось архивировать ботов');
    }
  };

  const handleRoleChange = async (user: UserRecord, role: UserRole) => {
    if (user.role === role) return;
    setRoleUpdatingId(user.id);
    try {
      const updated = await updateUserRole(user.id, role);
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
      toast.success(`Роль пользователя ${updated.email} изменена на ${roleLabels[updated.role]}`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось изменить роль');
    } finally {
      setRoleUpdatingId('');
    }
  };

  const markAsChanged = () => setHasUnsavedChanges(true);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-600 mt-1">Параметры выполнения, логирования и управление ролями</p>
        </div>
        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
          <Save className="w-4 h-4" />
          Сохранить изменения
        </Button>
      </div>

      {hasUnsavedChanges && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardBody>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-900">У вас есть несохранённые изменения.</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="space-y-6">
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Пользователи и роли</h2>
                <Badge variant="success">Администратор</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {filteredRoleSummary.map(({ role, count }) => (
                  <div key={role} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{roleLabels[role]}</p>
                      <Badge variant={roleBadgeVariant[role]}>{count}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{roleDescriptions[role]}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Поиск по имени, email, id или роли"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все роли</option>
                  {roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
                <Button variant="secondary" onClick={loadUsers}>Обновить</Button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создан</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{user.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                            <select
                              value={user.role}
                              disabled={roleUpdatingId === user.id || (currentUser?.id === user.id && user.role === 'admin' && roleCounts.admin <= 1)}
                              onChange={(event) => handleRoleChange(user, event.target.value as UserRole)}
                              className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              {roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{user.createdAt || '-'}</td>
                      </tr>
                    ))}
                    {!usersLoading && users.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Пользователи не найдены</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Настройки выполнения</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Лимит времени выполнения (мс)</label>
                <input
                  type="number"
                  value={sandboxTimeLimit}
                  onChange={(e) => { setSandboxTimeLimit(e.target.value); markAsChanged(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1000"
                  max="30000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Лимит памяти (МБ)</label>
                <input
                  type="number"
                  value={sandboxMemoryLimit}
                  onChange={(e) => { setSandboxMemoryLimit(e.target.value); markAsChanged(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="128"
                  max="2048"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Настройки логирования</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Уровень логирования по умолчанию</label>
                <select
                  value={defaultLogLevel}
                  onChange={(e) => { setDefaultLogLevel(e.target.value); markAsChanged(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {logLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Политика хранения логов</label>
                <select
                  value={logRetention}
                  onChange={(e) => { setLogRetention(e.target.value); markAsChanged(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {retentionPolicies.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {isAdmin && (
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">Опасная зона</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <p className="font-medium text-red-900">Очистить старые логи</p>
                    <p className="text-sm text-red-700 mt-1">Административная операция обслуживания логов.</p>
                  </div>
                  <Button variant="danger" onClick={() => setShowClearLogsModal(true)}><Trash2 className="w-4 h-4" />Очистить логи</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <p className="font-medium text-red-900">Архивировать неактивные боты</p>
                    <p className="text-sm text-red-700 mt-1">Переместить в архив неактивные или отключённые записи.</p>
                  </div>
                  <Button variant="danger" onClick={() => setShowArchiveBotsModal(true)}><Archive className="w-4 h-4" />Архивировать</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <ConfirmModal
        isOpen={showClearLogsModal}
        onClose={() => setShowClearLogsModal(false)}
        onConfirm={handleClearOldLogs}
        title="Очистить старые логи?"
        message={`Вы действительно хотите удалить все логи старше ${logRetention}? Это действие нельзя отменить.`}
        confirmText="Да, очистить"
        cancelText="Отмена"
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={showArchiveBotsModal}
        onClose={() => setShowArchiveBotsModal(false)}
        onConfirm={handleArchiveInactiveBots}
        title="Архивировать неактивные боты?"
        message="Вы действительно хотите архивировать всех неактивных ботов? Их можно будет восстановить позже."
        confirmText="Да, архивировать"
        cancelText="Отмена"
        isDangerous={true}
      />
    </div>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import type { UserRole } from '../api/client';
import { getCurrentUser } from '../api/client';
import { hasRole, roleLabels } from '../auth/permissions';
import { Card, CardBody } from './Card';
import { Button } from './Button';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const user = getCurrentUser();

  if (hasRole(user, allowedRoles)) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-16">
      <Card>
        <CardBody>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Недостаточно прав</h1>
              <p className="text-gray-600 mt-2">
                Текущая роль: <strong>{roleLabels[user?.role || 'user']}</strong>. Для этого раздела нужны роли:{' '}
                <strong>{allowedRoles.map((role) => roleLabels[role]).join(', ')}</strong>.
              </p>
              <Link to="/" className="inline-flex mt-5">
                <Button variant="secondary">Вернуться на обзор</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

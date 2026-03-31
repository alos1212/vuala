import React from 'react';
import type { Role } from '../../types/auth';

interface RolesBadgeProps {
  roles: Role[];
  maxShow?: number;
}

const RolesBadge: React.FC<RolesBadgeProps> = ({ roles, maxShow = 2 }) => {
  const visibleRoles = roles.slice(0, maxShow);
  const hiddenCount = roles.length - maxShow;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleRoles.map((role) => (
        <div key={role.id} className="badge badge-primary badge-sm">
          {role.display_name}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="badge badge-outline badge-sm">
          +{hiddenCount} más
        </div>
      )}
    </div>
  );
};

export default RolesBadge;
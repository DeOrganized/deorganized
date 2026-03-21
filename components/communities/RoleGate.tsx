import React from 'react';
import { MembershipRole } from '../../lib/api';

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
    founder: 4,
    admin: 3,
    moderator: 2,
    member: 1,
};

interface Props {
    userRole: MembershipRole | null;
    minRole: MembershipRole;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const RoleGate: React.FC<Props> = ({ userRole, minRole, children, fallback = null }) => {
    if (!userRole) return <>{fallback}</>;
    if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]) return <>{children}</>;
    return <>{fallback}</>;
};

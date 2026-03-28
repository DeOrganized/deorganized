import React, { useState } from 'react';
import { Loader2, Shield, Crown, Star, User } from 'lucide-react';
import { Membership, MembershipRole, updateMemberRole, leaveCommunity, getImageUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface Props {
    communitySlug: string;
    members: Membership[];
    userRole: MembershipRole | null;
    userMembershipId: number | null;
    onMembersChanged: (members: Membership[]) => void;
}

const ROLE_ICONS: Record<MembershipRole, React.ReactNode> = {
    founder: <Crown className="w-3 h-3 text-gold" />,
    admin: <Shield className="w-3 h-3 text-blue-400" />,
    moderator: <Star className="w-3 h-3 text-purple-400" />,
    member: <User className="w-3 h-3 text-inkLight" />,
};

const ROLE_LABELS: Record<MembershipRole, string> = {
    founder: 'Founder',
    admin: 'Admin',
    moderator: 'Mod',
    member: 'Member',
};

const ASSIGNABLE_ROLES: MembershipRole[] = ['admin', 'moderator', 'member'];

interface MemberRowProps {
    member: Membership;
    communitySlug: string;
    userRole: MembershipRole | null;
    userMembershipId: number | null;
    accessToken: string;
    onUpdated: (updated: Membership) => void;
    onRemoved: (id: number) => void;
}

const MemberRow: React.FC<MemberRowProps> = ({
    member,
    communitySlug,
    userRole,
    userMembershipId,
    accessToken,
    onUpdated,
    onRemoved,
}) => {
    const [saving, setSaving] = useState(false);

    const canManage =
        userRole &&
        member.role !== 'founder' &&
        (userRole === 'founder' || userRole === 'admin') &&
        member.id !== userMembershipId;

    const handleRoleChange = async (role: MembershipRole) => {
        setSaving(true);
        try {
            const updated = await updateMemberRole(communitySlug, member.id, role, accessToken);
            onUpdated({ ...member, role: updated.role });
        } catch (err) {
            console.error('Role update failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleKick = async () => {
        setSaving(true);
        try {
            await leaveCommunity(communitySlug, member.id, accessToken);
            onRemoved(member.id);
        } catch (err) {
            console.error('Remove member failed:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-3 py-3 border-b border-borderSubtle last:border-0">
            <div className="w-9 h-9 rounded-xl bg-surface overflow-hidden shrink-0">
                {member.user.profile_picture ? (
                    <img
                        src={getImageUrl(member.user.profile_picture) || ''}
                        alt={member.user.username}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-inkLight">
                        {member.user.username[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <span className="text-sm font-black text-ink truncate block">{member.user.username}</span>
            </div>

            <div className="flex items-center gap-1.5">
                {ROLE_ICONS[member.role]}
                <span className="text-xs text-inkLight">{ROLE_LABELS[member.role]}</span>
            </div>

            {canManage && (
                <div className="flex items-center gap-2 ml-2">
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-inkLight" />
                    ) : (
                        <>
                            <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(e.target.value as MembershipRole)}
                                className="text-xs bg-surface border border-borderSubtle rounded-lg px-2 py-1 text-ink focus:outline-none focus:border-gold"
                            >
                                {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleKick}
                                className="text-xs text-inkLight hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                            >
                                Remove
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export const CommunityMembers: React.FC<Props> = ({
    communitySlug,
    members: membersProp,
    userRole,
    userMembershipId,
    onMembersChanged,
}) => {
    const { accessToken } = useAuth();

    // Guard: backend may return paginated {results: [...]} or plain array
    const members: Membership[] = Array.isArray(membersProp)
        ? membersProp
        : Array.isArray((membersProp as any)?.results)
        ? (membersProp as any).results
        : [];

    const handleUpdated = (updated: Membership) => {
        onMembersChanged(members.map((m) => (m.id === updated.id ? updated : m)));
    };

    const handleRemoved = (id: number) => {
        onMembersChanged(members.filter((m) => m.id !== id));
    };

    if (members.length === 0) {
        return (
            <div className="text-center py-16 text-inkLight text-sm">
                No members yet.
            </div>
        );
    }

    return (
        <div>
            {members.map((member) => (
                <MemberRow
                    key={member.id}
                    member={member}
                    communitySlug={communitySlug}
                    userRole={userRole}
                    userMembershipId={userMembershipId}
                    accessToken={accessToken || ''}
                    onUpdated={handleUpdated}
                    onRemoved={handleRemoved}
                />
            ))}
        </div>
    );
};

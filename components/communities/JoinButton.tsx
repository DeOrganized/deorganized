import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { joinCommunity, leaveCommunity, MembershipRole } from '../../lib/api';

interface Props {
    communitySlug: string;
    membershipId: number | null;
    membershipRole: MembershipRole | null;
    communityLoading?: boolean;
    onChanged: (membershipId: number | null, role: MembershipRole | null) => void;
}

export const JoinButton: React.FC<Props> = ({ communitySlug, membershipId, membershipRole, communityLoading, onChanged }) => {
    const { accessToken, isBackendAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isBackendAuthenticated || communityLoading) return null;

    const isMember = membershipId !== null;
    const isFounder = membershipRole === 'founder';
    const isAdmin = membershipRole === 'admin';

    const handleClick = async () => {
        if (!accessToken || isFounder || isAdmin) return;
        setLoading(true);
        try {
            if (isMember) {
                await leaveCommunity(communitySlug, membershipId!, accessToken);
                onChanged(null, null);
            } else {
                const m = await joinCommunity(communitySlug, accessToken);
                onChanged(m.id, m.role as MembershipRole);
            }
        } catch (err) {
            console.error('Join/leave failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (isFounder || isAdmin) return null;

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black transition-colors ${
                isMember
                    ? 'bg-surface text-inkLight hover:bg-red-500/10 hover:text-red-500 border border-borderSubtle'
                    : 'bg-gold text-black hover:bg-gold/90'
            }`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isMember ? 'Leave' : 'Join'}
        </button>
    );
};

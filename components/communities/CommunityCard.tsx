import React from 'react';
import { Users } from 'lucide-react';
import { Community } from '../../lib/api';
import { getImageUrl } from '../../lib/api';

interface Props {
    community: Community;
    onNavigate: (page: any, id?: string | number) => void;
}

export const CommunityCard: React.FC<Props> = ({ community, onNavigate }) => {
    return (
        <div
            className="bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft cursor-pointer hover:border-gold/40 transition-colors"
            onClick={() => onNavigate('community-page', community.slug)}
        >
            {/* Banner */}
            <div className="h-24 bg-surface relative">
                {community.banner && (
                    <img
                        src={getImageUrl(community.banner) || ''}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                )}
                {/* Avatar */}
                <div className="absolute -bottom-5 left-4">
                    <div className="w-12 h-12 rounded-2xl border-2 border-canvas bg-surface overflow-hidden flex items-center justify-center">
                        {community.avatar ? (
                            <img src={getImageUrl(community.avatar) || ''} alt={community.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-lg font-black text-inkLight">{community.name[0]?.toUpperCase()}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-7 px-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-ink text-sm leading-tight">{community.name}</h3>
                    <span className="text-[10px] font-black text-inkLight uppercase bg-surface px-2 py-0.5 rounded-full shrink-0">{community.tier}</span>
                </div>
                {community.description && (
                    <p className="text-xs text-inkLight line-clamp-2 mb-3">{community.description}</p>
                )}
                <div className="flex items-center gap-1 text-inkLight">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{community.member_count} member{community.member_count !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>
    );
};

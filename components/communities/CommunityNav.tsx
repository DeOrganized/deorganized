import React from 'react';

type BaseTab = 'feed' | 'shows' | 'events' | 'merch' | 'members';

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
    showManage?: boolean;
    onManage?: () => void;
}

const TABS: { id: BaseTab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'shows', label: 'Shows' },
    { id: 'events', label: 'Events' },
    { id: 'merch', label: 'Merch' },
    { id: 'members', label: 'Members' },
];

export const CommunityNav: React.FC<Props> = ({ activeTab, onTabChange, showManage, onManage }) => {
    return (
        <div className="flex items-center gap-1 border-b border-borderSubtle overflow-x-auto">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-4 py-3 text-sm font-black whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        activeTab === tab.id
                            ? 'text-gold border-gold'
                            : 'text-inkLight border-transparent hover:text-ink'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
            {showManage && (
                <button
                    onClick={onManage}
                    className="ml-auto px-4 py-3 text-sm font-black text-inkLight hover:text-gold transition-colors whitespace-nowrap border-b-2 border-transparent -mb-px"
                >
                    Manage
                </button>
            )}
        </div>
    );
};

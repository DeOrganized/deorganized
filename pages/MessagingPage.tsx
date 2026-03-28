import React from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { MessagingInbox } from '../components/MessagingInbox';

interface MessagingPageProps {
    onNavigate: (page: string) => void;
}

export const MessagingPage: React.FC<MessagingPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-canvas flex flex-col pt-24">
            {/* Page Header */}
            <div className="border-b border-borderSubtle bg-canvas px-4 md:px-8 py-4 flex items-center gap-4">
                <button
                    onClick={() => onNavigate('profile')}
                    className="p-2 -ml-2 text-inkLight hover:text-ink transition-colors rounded-lg hover:bg-surface"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gold" />
                    <h1 className="text-lg font-bold text-ink">Messages</h1>
                </div>
            </div>

            {/* Full-height inbox */}
            <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl w-full mx-auto">
                <MessagingInbox heightClass="flex-1 min-h-[600px]" />
            </div>
        </div>
    );
};

export default MessagingPage;

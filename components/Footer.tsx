import React from 'react';
import { Twitter } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-canvas border-t border-borderSubtle py-8">
      <div className="container max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-inkLight font-medium">
          © 2026 DeOrganized. Built on Bitcoin. Powered by Stacks.
        </p>
        <div className="flex items-center gap-5">
          <a
            href="https://x.com/DeOrganizedBTC"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-inkLight hover:text-gold transition-colors flex items-center gap-1.5"
          >
            <Twitter className="w-3.5 h-3.5" />
            @DeOrganizedBTC
          </a>
          <a
            href="https://x.com/PeaceLoveMusicG"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-inkLight hover:text-gold transition-colors flex items-center gap-1.5"
          >
            <Twitter className="w-3.5 h-3.5" />
            @PeaceLoveMusicG
          </a>
        </div>
      </div>
    </footer>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Globe, User, Wallet, Moon, Sun } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { fetchNotifications } from '../lib/api';

interface NavbarProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Track if we've already checked this wallet to prevent infinite loops
  const walletCheckAttempted = useRef<string | null>(null);

  const {
    isWalletConnected,
    walletAddress,
    bnsName,
    connectWallet,
    isBackendAuthenticated,
    backendUser,
    logout,
    isAuthenticating,
    handleWalletConnect,
    accessToken
  } = useAuth();

  const { isDarkMode, toggleDarkMode } = useTheme();

  // Handle wallet connection with routing
  const handleConnect = async () => {
    // First connect wallet
    connectWallet();

    // Wait for wallet to connect, then check/authenticate
    // This will be handled by an effect
  };

  // Auto-authenticate when wallet connects (only once per wallet address)
  useEffect(() => {
    console.log('🔄 [NAVBAR useEffect] Running check:', { isWalletConnected, walletAddress, isBackendAuthenticated, isAuthenticating, currentPage });

    // Only proceed if:
    // 1. Wallet is connected
    // 2. We have an address
    // 3. User is not already authenticated
    // 4. Not currently authenticating
    // 5. We haven't already checked this specific wallet address
    // 6. We're not already on the register page (prevents loop)
    if (
      isWalletConnected &&
      walletAddress &&
      !isBackendAuthenticated &&
      !isAuthenticating &&
      walletCheckAttempted.current !== walletAddress &&
      currentPage !== 'register'  // KEY FIX: Don't re-check if already on register page
    ) {
      console.log('✅ [NAVBAR] All conditions met - triggering handleWalletConnect');
      // Mark this wallet as checked
      walletCheckAttempted.current = walletAddress;

      handleWalletConnect(
        // On new user - navigate to setup
        () => {
          if (onNavigate) onNavigate('register');
        },
        // On existing user - reload page to show authenticated state
        () => {
          console.log('✅ [NAVBAR] Existing user callback triggered - reloading page NOW...');
          // Reload to update all components with authenticated state
          window.location.reload();
        }
      );
    } else {
      console.log('❌ [NAVBAR] Skipping - condition failed:', {
        alreadyChecked: walletCheckAttempted.current === walletAddress,
        walletCheckAttempted: walletCheckAttempted.current
      });
    }
  }, [isWalletConnected, walletAddress, isBackendAuthenticated, isAuthenticating, currentPage, onNavigate, handleWalletConnect, backendUser]);

  // Fetch unread notifications count
  useEffect(() => {
    const loadNotifications = async () => {
      if (isBackendAuthenticated && accessToken) {
        try {
          const notifications = await fetchNotifications(accessToken);
          // Count ALL unread notifications (likes, comments, follows)
          const unreadCount = notifications.filter(n => !n.is_read).length;
          setUnreadNotifications(unreadCount);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      } else {
        setUnreadNotifications(0);
      }
    };

    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isBackendAuthenticated, accessToken]);

  // Reset wallet check flag when user logs out or becomes authenticated
  useEffect(() => {
    if (isBackendAuthenticated || !isWalletConnected) {
      walletCheckAttempted.current = null;
    }
  }, [isBackendAuthenticated, isWalletConnected]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { label: 'Shows', id: 'shows' },
    { label: 'Creators', id: 'creators' }
  ];

  // Format wallet address for display - show BNS name if available
  const getWalletDisplay = () => {
    if (bnsName) return bnsName;
    if (walletAddress) return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return 'Wallet';
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled
        ? 'bg-canvas/80 backdrop-blur-md border-borderSubtle py-4 shadow-sm'
        : 'bg-transparent border-transparent py-6'
        }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleNavClick('home')}
        >
          <img
            src="/logo.png"
            alt="Deorganized Logo"
            className="h-8 w-auto group-hover:scale-105 transition-transform"
            onError={(e) => {
              // Fallback to text logo if image fails
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <span className="text-xl font-bold text-ink tracking-tight hidden">
            De<span className="text-gold">organized</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.id)}
              className={`text-sm font-medium transition-colors ${currentPage === item.id
                ? 'text-gold'
                : 'text-inkLight hover:text-gold'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* CTA - Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-full bg-surface border border-borderSubtle flex items-center justify-center text-inkLight hover:text-gold hover:border-gold/30 transition-all shadow-sm"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {isBackendAuthenticated && backendUser ? (
            <>
              {/* Dashboard link for creators */}
              {backendUser.role === 'creator' && (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`relative text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'text-gold' : 'text-inkLight hover:text-gold'
                    }`}
                >
                  Studio
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
              )}

              {/* Profile button */}
              <button
                onClick={() => handleNavClick('user-profile')}
                className={`bg-canvas border hover:border-gold/50 hover:bg-surface px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-sm ${currentPage === 'user-profile' ? 'border-gold text-gold ring-1 ring-gold/20' : 'border-borderSubtle text-ink'
                  }`}
              >
                <User className="w-4 h-4" />
                {backendUser.username}
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="text-sm font-medium text-inkLight hover:text-gold transition-colors"
              >
                Logout
              </button>
            </>
          ) : isWalletConnected && walletAddress ? (
            <>
              {/* Wallet connected but not registered */}
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-borderSubtle rounded-full">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-ink">{getWalletDisplay()}</span>
              </div>
              <button
                onClick={() => handleNavClick('register')}
                className="bg-gold hover:bg-gold/90 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-md"
              >
                Complete Setup
              </button>
            </>
          ) : (
            /* Connect Wallet button */
            <button
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="bg-gold hover:bg-gold/90 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-4 h-4" />
              {isAuthenticating ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-ink"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-canvas border-b border-borderSubtle p-6 flex flex-col gap-4 shadow-lg">
          {navLinks.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.id)}
              className={`text-lg font-medium text-left ${currentPage === item.id ? 'text-gold' : 'text-ink hover:text-gold'
                }`}
            >
              {item.label}
            </button>
          ))}
          <div className="h-px bg-borderSubtle my-2" />

          {isBackendAuthenticated && backendUser ? (
            <>
              {backendUser.role === 'creator' && (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="text-lg font-medium text-left text-ink hover:text-gold"
                >
                  Creator Studio
                </button>
              )}
              <button
                onClick={() => handleNavClick('user-profile')}
                className="text-lg font-medium text-left text-ink hover:text-gold"
              >
                Profile ({backendUser.username})
              </button>
              <button
                onClick={logout}
                className="text-lg font-medium text-left text-inkLight hover:text-gold"
              >
                Logout
              </button>
            </>
          ) : isWalletConnected ? (
            <button
              onClick={() => handleNavClick('register')}
              className="bg-gold hover:bg-gold/90 text-white px-6 py-3 rounded-full text-lg font-semibold"
            >
              Complete Setup
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="bg-gold hover:bg-gold/90 text-white px-6 py-3 rounded-full text-lg font-semibold flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <Wallet className="w-5 h-5" />
              {isAuthenticating ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

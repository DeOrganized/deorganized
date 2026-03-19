import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { ShowsDiscovery } from './components/ShowsDiscovery';
import { CreatorsDiscovery } from './components/CreatorsDiscovery';
import { CreatorDashboard } from './components/CreatorDashboard';
import { UserDashboard } from './components/UserDashboard';
import { ShowDetail } from './components/ShowDetail';
import { CreatorDetail } from './components/CreatorDetail';
import { ProfileSetup } from './components/ProfileSetup';
import { EditProfile } from './components/EditProfile';
import { EventCalendar } from './components/EventCalendar';
import { EventDetail } from './components/EventDetail';
import { FeedbackPopup } from './components/FeedbackPopup';
import { AdminDashboard } from './components/AdminDashboard';
import { CommunityFeed } from './components/CommunityFeed';
import { PlayoutControl } from './components/PlayoutControl';
import { ToastProvider } from './components/Toast';


type PageView = 'home' | 'shows' | 'creators' | 'dashboard' | 'user-profile' | 'register' | 'show-detail' | 'creator-detail' | 'edit-profile' | 'event-calendar' | 'event-detail' | 'admin' | 'community' | 'playout-control';

// Map URL paths to page views and extract IDs
function parseUrl(pathname: string): { page: PageView; id: string | number | null } {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const base = parts[0]?.toLowerCase() || '';
  const param = parts[1] || null;

  switch (base) {
    case 'shows':
      return param ? { page: 'show-detail', id: param } : { page: 'shows', id: null };
    case 'creators':
      return param ? { page: 'creator-detail', id: param } : { page: 'creators', id: null };
    case 'events':
      return param ? { page: 'event-detail', id: param } : { page: 'event-calendar', id: null };
    case 'dashboard':
      return { page: 'dashboard', id: param }; // param holds the tab name if present
    case 'profile':
      return { page: 'user-profile', id: null };
    case 'edit-profile':
      return { page: 'edit-profile', id: null };
    case 'admin':
      return { page: 'admin', id: param }; // param holds the tab name if present
    case 'community':
      return { page: 'community', id: null };
    case 'playout':
      return { page: 'playout-control', id: null };
    case 'register':
      return { page: 'register', id: null };
    default:
      return { page: 'home', id: null };
  }
}

// Map page views back to URL paths
function pageToUrl(page: PageView, id?: string | number | null): string {
  switch (page) {
    case 'shows': return '/shows';
    case 'show-detail': return `/shows/${id}`;
    case 'creators': return '/creators';
    case 'creator-detail': return `/creators/${id}`;
    case 'event-calendar': return '/events';
    case 'event-detail': return `/events/${id}`;
    case 'dashboard': return id ? `/dashboard/${id}` : '/dashboard';
    case 'user-profile': return '/profile';
    case 'edit-profile': return '/edit-profile';
    case 'admin': return id ? `/admin/${id}` : '/admin';
    case 'community': return '/community';
    case 'playout-control': return '/playout';
    case 'register': return '/register';
    case 'home':
    default: return '/';
  }
}

const AppContent: React.FC = () => {
  // Initialize from URL
  const initialRoute = parseUrl(window.location.pathname);
  const [currentView, setCurrentView] = useState<PageView>(initialRoute.page);
  const [selectedId, setSelectedId] = useState<string | number | null>(initialRoute.id);
  const { backendUser, isBackendAuthenticated } = useAuth();

  const handleNavigate = useCallback((page: PageView, id?: string | number) => {
    setCurrentView(page);
    setSelectedId(id !== undefined ? id : null);
    const url = pageToUrl(page, id);
    window.history.pushState({ page, id: id ?? null }, '', url);
    window.scrollTo(0, 0);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const route = parseUrl(window.location.pathname);
      setCurrentView(route.page);
      setSelectedId(route.id);
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Replace initial history entry so the first page has state too
  useEffect(() => {
    const url = pageToUrl(currentView, selectedId);
    window.history.replaceState({ page: currentView, id: selectedId }, '', url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'user-profile':
        return <UserDashboard onNavigate={handleNavigate} />;
      case 'dashboard':
        return <CreatorDashboard onNavigate={handleNavigate} />;

      // Discovery Pages
      case 'shows':
        return <ShowsDiscovery onNavigate={handleNavigate} />;
      case 'creators':
        return <CreatorsDiscovery onNavigate={handleNavigate} />;

      // Detail Pages
      case 'show-detail':
        return selectedId ? <ShowDetail onNavigate={handleNavigate} showId={String(selectedId)} /> : <div>Show not found</div>;
      case 'creator-detail':
        return selectedId ? <CreatorDetail onNavigate={handleNavigate} creatorId={selectedId} /> : <div>Creator not found</div>;
      case 'event-calendar':
        return <EventCalendar onNavigate={handleNavigate} />;
      case 'event-detail':
        return selectedId ? <EventDetail onNavigate={handleNavigate} eventSlug={String(selectedId)} /> : <div>Event not found</div>;
      case 'edit-profile':
        return <EditProfile onNavigate={handleNavigate} />;
      case 'admin':
        return <AdminDashboard onNavigate={handleNavigate} />;
      case 'community':
        return <CommunityFeed onNavigate={handleNavigate} />;
      case 'playout-control':
        return <PlayoutControl onNavigate={handleNavigate} />;
      case 'register':
        return <ProfileSetup onNavigate={handleNavigate} />;
      case 'home':
      default:
        return <Hero onNavigate={handleNavigate} />;
    }
  };


  return (
    <div className="min-h-screen bg-canvas font-sans selection:bg-gold/20 selection:text-ink overflow-x-hidden text-ink">
      <Navbar onNavigate={handleNavigate} currentPage={currentView} />
      <main>
        {renderContent()}
      </main>
      <Footer onNavigate={handleNavigate} />
      <FeedbackPopup />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

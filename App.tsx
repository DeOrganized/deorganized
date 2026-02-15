import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Sponsors } from './components/Sponsors';
import { UpcomingShows } from './components/UpcomingShows';
import { CreatorBanner } from './components/CreatorBanner';
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


type PageView = 'home' | 'shows' | 'creators' | 'dashboard' | 'user-profile' | 'register' | 'show-detail' | 'creator-detail' | 'edit-profile' | 'event-calendar' | 'event-detail';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const { backendUser, isBackendAuthenticated } = useAuth();

  const handleNavigate = (page: PageView, id?: string | number) => {
    setCurrentView(page);
    if (id !== undefined) {
      setSelectedId(id);
    }
    window.scrollTo(0, 0);
  };

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
        return selectedId ? <CreatorDetail onNavigate={handleNavigate} creatorId={Number(selectedId)} /> : <div>Creator not found</div>;
      case 'event-calendar':
        return <EventCalendar onNavigate={handleNavigate} />;
      case 'event-detail':
        return selectedId ? <EventDetail onNavigate={handleNavigate} eventId={Number(selectedId)} /> : <div>Event not found</div>;
      case 'edit-profile':
        return <EditProfile onNavigate={handleNavigate} />;
      case 'register':
        return <ProfileSetup onNavigate={handleNavigate} />;
      case 'home':
      default:
        return (
          <>
            <Hero onNavigate={handleNavigate} />
            <Sponsors />

            {/* Editorial & Shows Section */}
            <section className="py-20 relative z-10">
              <UpcomingShows onNavigate={handleNavigate} />
            </section>

            {/* Community & Ecosystem */}
            <section className="py-12 space-y-24 container mx-auto px-6 max-w-[1280px]">
              <CreatorBanner
                onNavigate={handleNavigate}
                userRole={backendUser?.role || null}
                isAuthenticated={isBackendAuthenticated}
              />
            </section>
          </>
        );
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
      <AppContent />
    </AuthProvider>
  );
};

export default App;

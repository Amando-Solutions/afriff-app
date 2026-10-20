import { Suspense, lazy, useEffect, useState } from 'react';
import { checkForUpdates, currentVersion } from './lib/liveData.js';
import { useRoute } from './lib/router.js';
import Welcome, { shouldShowWelcome } from './components/Welcome.jsx';
import { Header, BottomNav } from './components/Chrome.jsx';
import SponsorMarquee from './components/SponsorMarquee.jsx';
import Home from './screens/Home.jsx';
import Programme from './screens/Programme.jsx';
import FilmPage from './screens/FilmPage.jsx';
import EventPage from './screens/EventPage.jsx';
import MyFestival from './screens/MyFestival.jsx';
import Queues from './screens/Queues.jsx';
import Venues from './screens/Venues.jsx';
import News from './screens/News.jsx';

// Which screen to show for each address
const SCREENS = {
  home: { Screen: Home, tab: 'home' },
  programme: { Screen: Programme, tab: 'programme' },
  film: { Screen: FilmPage, tab: 'programme' },
  event: { Screen: EventPage, tab: 'programme' },
  my: { Screen: MyFestival, tab: 'my' },
  queues: { Screen: Queues, tab: 'queues' },
  venues: { Screen: Venues, tab: 'home' },
  news: { Screen: News, tab: null },
};

// The admin console (and Firebase) is only downloaded when #/admin is opened,
// so attendees' phones never load it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  const route = useRoute();
  const { Screen, tab } = SCREENS[route.name] || SCREENS.home;
  const [welcome, setWelcome] = useState(shouldShowWelcome);
  const [dataVersion, setDataVersion] = useState(currentVersion);

  // look for newly published festival data now, every 5 minutes, and when the app is reopened
  useEffect(() => {
    const check = () => checkForUpdates().then((changed) => changed && setDataVersion(currentVersion()));
    check();
    const timer = setInterval(check, 5 * 60 * 1000);
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<div className="ad-loading">Loading admin…</div>}>
        <AdminApp param={route.param} rest={route.rest} />
      </Suspense>
    );
  }

  return (
    <div className="app">
      {/* key: when newly published data arrives, these redraw with it */}
      <div key={dataVersion}>
        <SponsorMarquee variant="ribbon" />
        <Header />
        <main className="main">
          <Screen param={route.param} />
        </main>
        <BottomNav active={tab} />
      </div>
      {welcome && <Welcome onDone={() => setWelcome(false)} />}
    </div>
  );
}

import { Suspense, lazy, useState } from 'react';
import { useRoute } from './lib/router.js';
import Welcome, { shouldShowWelcome } from './components/Welcome.jsx';
import { Header, BottomNav } from './components/Chrome.jsx';
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

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<div className="ad-loading">Loading admin…</div>}>
        <AdminApp param={route.param} rest={route.rest} />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Screen param={route.param} />
      </main>
      <BottomNav active={tab} />
      {welcome && <Welcome onDone={() => setWelcome(false)} />}
    </div>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './styles.css';
import App from './App.jsx';
import { FestivalProvider } from './lib/store.jsx';
import { loadSavedCopy } from './lib/liveData.js';

// use the festival data saved on this phone last time, before anything shows
loadSavedCopy();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FestivalProvider>
      <App />
    </FestivalProvider>
  </StrictMode>
);

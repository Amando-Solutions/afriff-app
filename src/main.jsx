import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './styles.css';
import App from './App.jsx';
import { FestivalProvider } from './lib/store.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FestivalProvider>
      <App />
    </FestivalProvider>
  </StrictMode>
);
